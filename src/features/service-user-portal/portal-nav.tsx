import { AlertTriangle, BookOpen, Calendar, CalendarClock, Camera, CheckCircle2, Home, UserCircle, Users } from 'lucide-react'
import type { NavItem } from '@/components/layout/sidebar-types'

export const portalNavItems: NavItem[] = [
  { label: 'Dashboard', icon: <Home className="h-5 w-5" />, href: '/portal' },
  { label: 'Personal details', icon: <UserCircle className="h-5 w-5" />, href: '/portal/profile' },
  { label: 'Contacts', icon: <Users className="h-5 w-5" />, href: '/portal/contacts' },
  { label: 'About Me', icon: <BookOpen className="h-5 w-5" />, href: '/portal/about-me' },
  { label: 'Visit plan', icon: <CalendarClock className="h-5 w-5" />, href: '/portal/visit-plans' },
  { label: 'Completed visits', icon: <CheckCircle2 className="h-5 w-5" />, href: '/portal/completed-visits' },
  { label: 'Allergies', icon: <AlertTriangle className="h-5 w-5" />, href: '/portal/allergies' },
  { label: 'Calendar', icon: <Calendar className="h-5 w-5" />, href: '/portal/calendar' },
  { label: 'Photos', icon: <Camera className="h-5 w-5" />, href: '/portal/photos' },
]

export const portalPageTitles: Record<string, string> = {
  '/portal': 'Dashboard',
  '/portal/profile': 'Personal details',
  '/portal/contacts': 'Contacts',
  '/portal/about-me': 'About Me',
  '/portal/visit-plans': 'Visit plan',
  '/portal/completed-visits': 'Completed visits',
  '/portal/allergies': 'Allergies',
  '/portal/calendar': 'Calendar',
  '/portal/photos': 'Photos',
}
