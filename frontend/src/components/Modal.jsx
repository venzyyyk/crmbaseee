import React, { useEffect } from 'react'

export default function Modal({ open, title, children, onClose }) {
  useEffect(() => {
    function onEsc(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  return (
    <div
      id="modal"
      className="modal"
      style={{ display: open ? 'flex' : 'none' }}
      onClick={(e) => {
        if (e.target.id === 'modal') onClose?.()
      }}
    >
      <div className="modal-content">
        <span id="close-modal" style={{ cursor: 'pointer' }} onClick={() => onClose?.()}>
          &times;
        </span>
        <h3 id="modal-title">{title}</h3>
        <div id="modal-body">{children}</div>
      </div>
    </div>
  )
}
