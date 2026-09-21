export function handleRadioKeydown(event) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  const buttons = [...event.currentTarget.querySelectorAll('[role="radio"]')].filter((button) => !button.disabled)
  const index = buttons.indexOf(event.target.closest('[role="radio"]'))
  if (index < 0 || !buttons.length) return
  event.preventDefault()
  const step = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
    : (index + step + buttons.length) % buttons.length
  buttons[next].focus()
  buttons[next].click()
}
