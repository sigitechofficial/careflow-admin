import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/api-client'
import { policyErrorCopy } from '@/features/policies/policy-error'
import { buildPolicyContent, extractPolicyText, policySourceBadge } from '@/features/policies/policy-content'
import { summariseApplicability, summariseAudience } from '@/features/policies/policy-format'
import { emptyPolicyForm, formFromPolicy, policyFormToWriteInput, validatePolicyDraft, validatePolicyForReview, validatePolicyForm } from '@/features/policies/components/PolicyForm'
import type { PolicyDocument } from '@/features/policies/types/policy.types'
import { validatePolicyUploadFile } from '@/features/policies/policy-upload'
import { validateApplicability } from '@/features/policies/components/PolicyApplicabilityEditor'

describe('unsaved draft detection', () => {
  it('treats edited draft values as dirty', () => {
    const initial = emptyPolicyForm('u1', true)
    const edited = { ...initial, title: 'Safeguarding' }
    expect(JSON.stringify(edited) === JSON.stringify(initial)).toBe(false)
    expect(Object.keys(validatePolicyDraft(edited)).length).toBeGreaterThan(0)
  })
})

describe('policy content', () => {
  it('round-trips plain text through the editor payload', () => {
    const built = buildPolicyContent('Safeguarding body')
    expect(extractPolicyText(built.contentJson, built.contentHtml)).toBe('Safeguarding body')
  })

  it('stores TipTap JSON when the editor document is provided', () => {
    const built = buildPolicyContent('<p>Hello</p>', { type: 'doc', content: [] })
    expect(built.contentJson).toEqual({ type: 'tiptap', version: 1, doc: { type: 'doc', content: [] } })
    expect(built.contentHtml).toBe('<p>Hello</p>')
  })

  it('labels library sources as Written, PDF, or DOCX', () => {
    expect(policySourceBadge({ hasDocument: false, contentKind: 'EDITOR' })).toBe('Written')
    expect(policySourceBadge({ hasDocument: true, fileName: 'a.pdf', mimeType: 'application/pdf' })).toBe('PDF')
    expect(
      policySourceBadge({
        hasDocument: true,
        fileName: 'a.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    ).toBe('DOCX')
  })
})

describe('policy upload validation', () => {
  it('accepts pdf/doc/docx and rejects empty, huge, and unsupported files', () => {
    const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' })
    Object.defineProperty(pdf, 'size', { value: 1024 })
    expect(validatePolicyUploadFile(pdf)).toBeNull()
    expect(validatePolicyUploadFile(new File([''], 'a.pdf', { type: 'application/pdf' }))).toBe('empty')
    const huge = new File(['x'], 'a.pdf', { type: 'application/pdf' })
    Object.defineProperty(huge, 'size', { value: 26 * 1024 * 1024 })
    expect(validatePolicyUploadFile(huge)).toBe('too_large')
    expect(validatePolicyUploadFile(new File(['x'], 'a.txt', { type: 'text/plain' }))).toBe('unsupported')
  })
})

describe('policyErrorCopy', () => {
  it('maps 403, 404, 409, and 500 without exposing stack traces', () => {
    expect(policyErrorCopy(new ApiError('nope', 403)).message).toBe(
      "You don't have permission to perform this action.",
    )
    expect(policyErrorCopy(new ApiError('missing', 404)).message).toBe('Policy not found.')
    expect(policyErrorCopy(new ApiError('stale', 409)).message).toBe(
      'This policy has changed. Refresh before continuing.',
    )
    expect(policyErrorCopy(new ApiError('boom', 500)).message).toBe('Something went wrong. Try again later.')
  })
})

describe('policy summaries', () => {
  it('describes organisation-wide applicability', () => {
    expect(summariseApplicability([{ organisationWide: true, locationId: null, serviceTypeCode: null }], { locations: {}, services: {} })).toBe(
      'Organisation-wide',
    )
  })

  it('describes audience matching with OR and AND', () => {
    expect(
      summariseAudience(
        [
          { targetType: 'ROLE', roleId: 'r1', jobTitleId: null, workAreaId: null, locationId: null },
          { targetType: 'ROLE', roleId: 'r2', jobTitleId: null, workAreaId: null, locationId: null },
          { targetType: 'LOCATION', roleId: null, jobTitleId: null, workAreaId: null, locationId: 'l1' },
        ],
        {
          roles: { r1: 'Care Worker', r2: 'Senior Care Worker' },
          jobTitles: {},
          workAreas: {},
          locations: { l1: 'London' },
        },
      ),
    ).toBe('Care Worker OR Senior Care Worker AND London')
  })

  it('treats an empty audience as all employees', () => {
    expect(summariseAudience([], { roles: {}, jobTitles: {}, workAreas: {}, locations: {} })).toBe('All employees')
  })
})

describe('validatePolicyDraft', () => {
  it('allows an empty new form to be rejected only for backend-required fields', () => {
    const errors = validatePolicyDraft(emptyPolicyForm('u1', true))
    expect(errors.title).toBeTruthy()
    expect(errors.reference).toBeTruthy()
    expect(errors.primaryCategoryId).toBeTruthy()
    expect(errors.contentHtml).toBeUndefined()
    expect(errors.applicability).toBeUndefined()
  })

  it('allows a partially completed form to save as draft', () => {
    const values = {
      ...emptyPolicyForm('u1', true),
      title: 'Safeguarding adults',
      reference: 'POL-SAF-001',
      primaryCategoryId: 'c1',
      description: 'Notes in progress',
    }
    expect(validatePolicyDraft(values)).toEqual({})
  })

  it('allows a draft with only the minimum persistable fields', () => {
    const values = {
      ...emptyPolicyForm('u1', true),
      title: 'Title only',
      reference: 'POL-MIN-001',
      primaryCategoryId: 'c1',
    }
    expect(validatePolicyDraft(values)).toEqual({})
    expect(validatePolicyDraft(values).contentHtml).toBeUndefined()
  })

  it('does not require final-policy fields such as content, dates, audience, or complete applicability', () => {
    const values = {
      ...emptyPolicyForm('u1', false),
      title: 'Branch draft',
      reference: 'POL-BR-DRAFT',
      primaryCategoryId: 'c1',
      description: 'WIP',
      contentHtml: '',
      tagIds: ['t1'],
      links: [{ moduleType: 'CARE_PLAN' as const, scope: 'MODULE' as const }],
    }
    const errors = validatePolicyDraft(values, {
      locationRestricted: true,
      allowedLocationIds: ['loc-london'],
    })
    expect(errors).toEqual({})
  })

  it('still rejects data that cannot be persisted', () => {
    expect(validatePolicyDraft(emptyPolicyForm('u1', true)).title).toBe('Enter a policy title.')
    expect(
      validatePolicyDraft({
        ...emptyPolicyForm('u1', true),
        title: 'T',
        reference: 'R',
        primaryCategoryId: 'c1',
        effectiveDate: '2027-01-01',
        reviewDate: '2026-01-01',
      }).reviewDate,
    ).toBe('Review date cannot be before the effective date.')
    expect(
      validatePolicyDraft(
        {
          ...emptyPolicyForm('u1', false),
          title: 'T',
          reference: 'R',
          primaryCategoryId: 'c1',
          applicability: [{ organisationWide: false, locationId: 'loc-birmingham' }],
        },
        { locationRestricted: true, allowedLocationIds: ['loc-london'] },
      ).applicability,
    ).toBe('Select a branch you have access to.')
  })
})

describe('validatePolicyForReview', () => {
  it('requires title, reference, category, and content', () => {
    const errors = validatePolicyForReview(emptyPolicyForm('u1', true))
    expect(errors.title).toBeTruthy()
    expect(errors.reference).toBeTruthy()
    expect(errors.primaryCategoryId).toBeTruthy()
    expect(errors.contentHtml).toBeTruthy()
    const upload = { ...emptyPolicyForm('u1', true), contentMode: 'UPLOAD' as const, title: 'A', reference: 'R', primaryCategoryId: 'c1' }
    expect(validatePolicyForReview(upload).contentHtml).toBeTruthy()
    expect(
      validatePolicyForReview({ ...upload, uploadedFile: { fileName: 'a.pdf', mimeType: 'application/pdf', fileSize: 10 } }).contentHtml,
    ).toBeUndefined()
    expect(errors.applicability).toBeUndefined()
  })

  it('blocks submitting a branch-scoped draft with an empty targeted row', () => {
    const values = {
      ...emptyPolicyForm('u1', false),
      title: 'T',
      reference: 'R',
      primaryCategoryId: 'c1',
      contentHtml: '<p>Body</p>',
    }
    const errors = validatePolicyForReview(values, {
      locationRestricted: true,
      allowedLocationIds: ['loc-london'],
    })
    expect(errors.applicability).toBe('Select a branch for each target.')
    expect(validatePolicyDraft(values, { locationRestricted: true, allowedLocationIds: ['loc-london'] })).toEqual({})
  })
})

describe('validatePolicyForm', () => {
  it('requires title, reference, category, and content', () => {
    const errors = validatePolicyForm(emptyPolicyForm('u1', true))
    expect(errors.title).toBeTruthy()
    expect(errors.reference).toBeTruthy()
    expect(errors.primaryCategoryId).toBeTruthy()
    expect(errors.contentHtml).toBeTruthy()
    const upload = { ...emptyPolicyForm('u1', true), contentMode: 'UPLOAD' as const, title: 'A', reference: 'R', primaryCategoryId: 'c1' }
    expect(validatePolicyForm(upload).contentHtml).toBeTruthy()
    expect(
      validatePolicyForm({ ...upload, uploadedFile: { fileName: 'a.pdf', mimeType: 'application/pdf', fileSize: 10 } }).contentHtml,
    ).toBeUndefined()
    expect(errors.applicability).toBeUndefined()
  })

  it('blocks a branch-scoped user from submitting an empty targeted row', () => {
    const values = emptyPolicyForm('u1', false)
    const errors = validatePolicyForm(values, {
      locationRestricted: true,
      allowedLocationIds: ['loc-london'],
    })
    expect(errors.applicability).toBe('Select a branch for each target.')
  })
})

describe('validateApplicability', () => {
  const london = 'loc-london'
  const birmingham = 'loc-birmingham'

  it('allows unrestricted organisation-wide targeting', () => {
    expect(validateApplicability([{ organisationWide: true }])).toBeUndefined()
  })

  it('allows unrestricted service-type-only targeting', () => {
    expect(
      validateApplicability([{ organisationWide: false, serviceTypeCode: 'DOMICILIARY' }]),
    ).toBeUndefined()
  })

  it('allows unrestricted location-only targeting', () => {
    expect(validateApplicability([{ organisationWide: false, locationId: london }])).toBeUndefined()
  })

  it('allows unrestricted location + service type targeting', () => {
    expect(
      validateApplicability([
        { organisationWide: false, locationId: london, serviceTypeCode: 'DOMICILIARY' },
      ]),
    ).toBeUndefined()
  })

  it('allows a branch-scoped user to target an assigned location', () => {
    expect(
      validateApplicability([{ organisationWide: false, locationId: london }], {
        locationRestricted: true,
        allowedLocationIds: [london],
      }),
    ).toBeUndefined()
  })

  it('allows a branch-scoped user to combine location and service type', () => {
    expect(
      validateApplicability(
        [{ organisationWide: false, locationId: london, serviceTypeCode: 'DOMICILIARY' }],
        { locationRestricted: true, allowedLocationIds: [london] },
      ),
    ).toBeUndefined()
  })

  it('rejects organisation-wide targeting for branch-scoped users', () => {
    expect(
      validateApplicability([{ organisationWide: true }], {
        locationRestricted: true,
        allowedLocationIds: [london],
      }),
    ).toMatch(/assigned branches/i)
  })

  it('rejects an empty targeted row for branch-scoped users', () => {
    expect(
      validateApplicability([{ organisationWide: false }], {
        locationRestricted: true,
        allowedLocationIds: [london],
      }),
    ).toBe('Select a branch for each target.')
  })

  it('rejects service-type-only targeting for branch-scoped users', () => {
    expect(
      validateApplicability([{ organisationWide: false, serviceTypeCode: 'DOMICILIARY' }], {
        locationRestricted: true,
        allowedLocationIds: [london],
      }),
    ).toBe('Select a branch for each target.')
  })

  it('rejects a location the branch-scoped user cannot access', () => {
    expect(
      validateApplicability([{ organisationWide: false, locationId: birmingham }], {
        locationRestricted: true,
        allowedLocationIds: [london],
      }),
    ).toBe('Select a branch you have access to.')
  })

  it('rejects a targeted row with neither location nor service type for unrestricted users', () => {
    expect(validateApplicability([{ organisationWide: false }])).toBe(
      'Each target needs a branch or a care service.',
    )
  })

  it('allows incomplete targeting when saving a draft', () => {
    expect(
      validateApplicability([{ organisationWide: false }], {
        mode: 'draft',
        locationRestricted: true,
        allowedLocationIds: [london],
      }),
    ).toBeUndefined()
    expect(validateApplicability([], { mode: 'draft' })).toBeUndefined()
  })

  it('still rejects an inaccessible branch on draft save', () => {
    expect(
      validateApplicability([{ organisationWide: false, locationId: birmingham }], {
        mode: 'draft',
        locationRestricted: true,
        allowedLocationIds: [london],
      }),
    ).toBe('Select a branch you have access to.')
  })
})

describe('partial draft round-trip', () => {
  it('preserves entered fields when converting a form to the write payload', () => {
    const values = {
      ...emptyPolicyForm('u1', true),
      title: 'Safeguarding adults',
      reference: 'POL-SAF-001',
      primaryCategoryId: 'c1',
      description: 'WIP notes',
      contentHtml: '<p>Partial body</p>',
      tagIds: ['tag-1'],
      reviewerId: 'u2',
      effectiveDate: '2026-09-03',
      applicability: [{ organisationWide: true }],
      links: [{ moduleType: 'CARE_PLAN' as const, scope: 'MODULE' as const, label: 'Care plans' }],
    }
    const payload = policyFormToWriteInput(values)
    expect(payload.title).toBe('Safeguarding adults')
    expect(payload.reference).toBe('POL-SAF-001')
    expect(payload.primaryCategoryId).toBe('c1')
    expect(payload.description).toBe('WIP notes')
    expect(payload.contentHtml).toContain('Partial body')
    expect(payload.tagIds).toEqual(['tag-1'])
    expect(payload.reviewerId).toBe('u2')
    expect(payload.effectiveDate).toBe('2026-09-03')
    expect(payload.links).toEqual([{ moduleType: 'CARE_PLAN', scope: 'MODULE', label: 'Care plans' }])
  })

  it('reloads a saved partial draft with all entered data intact', () => {
    const document: PolicyDocument = {
      id: 'p1',
      reference: 'POL-SAF-001',
      title: 'Safeguarding adults',
      description: 'WIP notes',
      documentType: 'POLICY',
      source: 'EDITOR',
      primaryCategoryId: 'c1',
      primaryCategory: { id: 'c1', name: 'Safeguarding', code: 'SAF' },
      tags: [{ id: 'tag-1', name: 'Mandatory' }],
      parentDocumentId: null,
      currentVersionId: 'v1',
      status: 'DRAFT',
      isCatalogue: false,
      ownerId: 'u1',
      reviewerId: 'u2',
      approverId: null,
      createdById: 'u1',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      currentVersion: {
        id: 'v1',
        documentId: 'p1',
        versionMajor: 1,
        versionMinor: 0,
        versionLabel: 'v1.0',
        status: 'DRAFT',
        titleSnapshot: 'Safeguarding adults',
        contentJson: { type: 'tiptap', version: 1, doc: { type: 'doc', content: [] } },
        contentHtml: '<p>Partial body</p>',
        changeSummary: null,
        fileName: null,
        mimeType: null,
        fileSize: null,
        hasDocument: false,
        contentKind: 'EDITOR',
        effectiveDate: '2026-09-03',
        reviewDate: null,
        publishedAt: null,
        publishedById: null,
        archivedAt: null,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
        applicability: [{ organisationWide: false, locationId: null, serviceTypeCode: null }],
        audiences: [],
        links: [{ moduleType: 'CARE_PLAN', scope: 'MODULE', recordId: null, sectionKey: null, label: 'Care plans' }],
      },
    }
    const loaded = formFromPolicy(document, document.currentVersion, 'u1')
    expect(loaded.title).toBe('Safeguarding adults')
    expect(loaded.reference).toBe('POL-SAF-001')
    expect(loaded.description).toBe('WIP notes')
    expect(loaded.contentHtml).toContain('Partial body')
    expect(loaded.tagIds).toEqual(['tag-1'])
    expect(loaded.reviewerId).toBe('u2')
    expect(loaded.effectiveDate).toBe('2026-09-03')
    expect(loaded.reviewDate).toBe('')
    expect(loaded.applicability).toEqual([{ organisationWide: false }])
    expect(loaded.links).toEqual([{ moduleType: 'CARE_PLAN', scope: 'MODULE', label: 'Care plans' }])
  })

  it('omits incomplete targeting and blank editor content from the write payload', () => {
    const payload = policyFormToWriteInput({
      ...emptyPolicyForm('u1', false),
      title: 'Safeguarding adults',
      reference: 'POL-SAF-001',
      primaryCategoryId: 'c1',
    })
    expect(payload).toEqual({
      title: 'Safeguarding adults',
      reference: 'POL-SAF-001',
      documentType: 'POLICY',
      primaryCategoryId: 'c1',
      source: 'EDITOR',
      ownerId: 'u1',
      // New policies are read and signed by default.
      acknowledgementRequired: true,
    })
    expect(payload.applicability).toBeUndefined()
    expect(payload.contentHtml).toBeUndefined()
  })
})
