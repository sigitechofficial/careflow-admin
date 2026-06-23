import * as React from 'react'
import type { ScheduleVisitWorkspaceTab } from '@/features/scheduling/components/ScheduleVisitWorkspaceContent'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { ScheduleJobAllocateDialogPanel } from '@/features/scheduling/types/schedule-job-context-actions.types'

export function useScheduleJobsPageDialogs() {
  const [allocateJobId, setAllocateJobId] = React.useState<string | null>(null)
  const [allocateDialogPanel, setAllocateDialogPanel] =
    React.useState<ScheduleJobAllocateDialogPanel>('allocate')
  const [allocateOpen, setAllocateOpen] = React.useState(false)
  const [notesJob, setNotesJob] = React.useState<TimelineJob | null>(null)
  const [notesOpen, setNotesOpen] = React.useState(false)
  const [completeJobTarget, setCompleteJobTarget] = React.useState<TimelineJob | null>(null)
  const [completeOpen, setCompleteOpen] = React.useState(false)
  const [cancelJobTarget, setCancelJobTarget] = React.useState<TimelineJob | null>(null)
  const [cancelOpen, setCancelOpen] = React.useState(false)
  const [reinstateJobTarget, setReinstateJobTarget] = React.useState<TimelineJob | null>(null)
  const [reinstateOpen, setReinstateOpen] = React.useState(false)
  const [workspaceJob, setWorkspaceJob] = React.useState<TimelineJob | null>(null)
  const [workspaceOpen, setWorkspaceOpen] = React.useState(false)
  const [workspaceTab, setWorkspaceTab] = React.useState<ScheduleVisitWorkspaceTab>('overview')
  const [savingJobId, setSavingJobId] = React.useState<string | null>(null)
  const [createRunOpen, setCreateRunOpen] = React.useState(false)
  const [createRunJobs, setCreateRunJobs] = React.useState<TimelineJob[]>([])

  return {
    allocateJobId,
    setAllocateJobId,
    allocateDialogPanel,
    setAllocateDialogPanel,
    allocateOpen,
    setAllocateOpen,
    notesJob,
    setNotesJob,
    notesOpen,
    setNotesOpen,
    completeJobTarget,
    setCompleteJobTarget,
    completeOpen,
    setCompleteOpen,
    cancelJobTarget,
    setCancelJobTarget,
    cancelOpen,
    setCancelOpen,
    reinstateJobTarget,
    setReinstateJobTarget,
    reinstateOpen,
    setReinstateOpen,
    workspaceJob,
    setWorkspaceJob,
    workspaceOpen,
    setWorkspaceOpen,
    workspaceTab,
    setWorkspaceTab,
    savingJobId,
    setSavingJobId,
    createRunOpen,
    setCreateRunOpen,
    createRunJobs,
    setCreateRunJobs,
  }
}

export type ScheduleJobsPageDialogs = ReturnType<typeof useScheduleJobsPageDialogs>
