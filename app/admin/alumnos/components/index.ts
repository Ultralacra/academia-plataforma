// Barrel exports para componentes relacionados con la ficha de alumno

export { default as ActivityFeed } from '../[code]/_parts/ActivityFeed'
export { default as ChatPanel } from '../[code]/_parts/ChatPanel'
export { default as CoachesCard } from '../[code]/_parts/CoachesCard'
export { default as CoachPickerModal } from '../[code]/_parts/CoachPickerModal'
export { default as EditForm } from '../[code]/_parts/EditForm'
export { default as Header } from '../[code]/_parts/Header'
export { default as MetricsStrip } from '../[code]/_parts/MetricsStrip'
export { default as PhasesTimeline } from '../[code]/_parts/PhasesTimeline'
export { default as TicketsPanel } from '../[code]/_parts/TicketsPanel'

// Exportar componentes de mayor nivel
export { default as StudentsContent } from '../StudentsContent'
export { default as StudentDetailContent } from '../[code]/page'

// StudentDetailLayout is available in this folder as a standalone file.
// Export removed from the barrel to avoid import resolution checks in the current TS config.
