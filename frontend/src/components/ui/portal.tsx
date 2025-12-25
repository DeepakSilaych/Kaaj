import { createPortal } from 'react-dom'
import { ReactNode } from 'react'

export function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body)
}

