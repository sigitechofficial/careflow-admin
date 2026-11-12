import { describe, expect, it } from 'vitest'
import { ROUND_TASKS, pickRoundTasks } from '@/features/scripts/task-dataset'

const LIST = ['Assisted wash', 'Dress / undress', 'Meal prep', 'Encourage fluids', 'Companionship', 'Catheter care', 'Bed-making']

describe('pickRoundTasks', () => {
  it('picks only tasks in the task list, the round’s own first', () => {
    const picked = pickRoundTasks('MORNING', 2, LIST, [])
    expect(picked).toHaveLength(2)
    expect(picked.every((t) => ROUND_TASKS.MORNING!.includes(t))).toBe(true)
  })

  it('never picks a clinical task or one already on the round (any case)', () => {
    const picked = pickRoundTasks('MORNING', 10, LIST, ['assisted WASH'])
    expect(picked).not.toContain('Catheter care')
    expect(picked).not.toContain('Assisted wash')
    expect(new Set(picked).size).toBe(picked.length)
  })

  it('falls back to general tasks, and returns the task list spelling', () => {
    const picked = pickRoundTasks('NIGHT', 3, ['bed-making', 'COMPANIONSHIP'], [])
    expect(picked.sort()).toEqual(['COMPANIONSHIP', 'bed-making'])
  })
})
