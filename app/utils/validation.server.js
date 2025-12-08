export function validatePhoneNumber(phone) {
  const e164Regex = /^\+[1-9]\d{1,14}$/
  return e164Regex.test(phone)
}

export function validateTemplateVariables(content) {
  const variables = content.match(/\{\{(\w+)\}\}/g) || []
  return {
    hasVariables: variables.length > 0,
    variables: variables.map((v) => v.replace(/[{}]/g, "")),
  }
}

export function validateAutomationRule(data) {
  const errors = {}
  if (!data.name?.trim()) errors.name = "Name is required"
  if (!data.trigger) errors.trigger = "Trigger event is required"
  if (!data.templateId) errors.templateId = "Template is required"
  return errors
}

export function validateMessageTemplate(data) {
  const errors = {}
  if (!data.name?.trim()) errors.name = "Template name is required"
  if (!data.category) errors.category = "Category is required"
  if (!data.content?.trim()) errors.content = "Message content is required"
  if (data.content?.length > 1024) errors.content = "Message must be under 1024 characters"
  return errors
}
