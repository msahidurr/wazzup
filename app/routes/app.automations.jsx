"use client"

import { useLoaderData, useFetcher } from "react-router"
import { useState, useEffect } from "react"
import { authenticate } from "../shopify.server"
import prisma from "../db.server"

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request)
  const shopDomain = session?.shop

  if (!shopDomain) {
    throw new Response("Unauthorized", { status: 401 })
  }

  try {
    const shop = await prisma.shop.findUnique({
      where: { shopDomain },
    })

    if (!shop) {
      throw new Response("Shop not configured", { status: 404 })
    }

    const [automations, templates] = await Promise.all([
      prisma.automationRule.findMany({
        where: { shopId: shop.id },
        include: { template: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.messageTemplate.findMany({
        where: { shopId: shop.id },
      }),
    ])
    return { automations, templates }
  } catch (error) {
    console.error("Error loading automations:", error)
    return { automations: [], templates: [] }
  }
}

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request)
  const shopDomain = session?.shop

  if (!shopDomain) {
    throw new Response("Unauthorized", { status: 401 })
  }

  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
  })

  if (!shop) {
    return Response.json({ success: false, error: "Shop not found" }, { status: 404 })
  }

  if (request.method === "POST") {
    const formData = await request.formData()
    const actionType = formData.get("actionType")

    try {
      if (actionType === "create") {
        const name = formData.get("name")?.trim()
        const trigger = formData.get("trigger")
        const templateId = formData.get("templateId")

        if (!name || !trigger || !templateId) {
          return Response.json({ success: false, error: "All fields are required" }, { status: 400 })
        }

        const automation = await prisma.automationRule.create({
          data: {
            name,
            trigger,
            templateId,
            shopId: shop.id,
          },
          include: { template: true },
        })
        return Response.json({ success: true, automation })
      }

      if (actionType === "delete") {
        const automationId = formData.get("automationId")
        await prisma.automationRule.delete({
          where: { id: automationId },
        })
        return Response.json({ success: true })
      }

      if (actionType === "toggle") {
        const automationId = formData.get("automationId")
        const automation = await prisma.automationRule.findUnique({
          where: { id: automationId },
        })
        const updated = await prisma.automationRule.update({
          where: { id: automationId },
          data: { isActive: !automation.isActive },
          include: { template: true },
        })
        return Response.json({ success: true, automation: updated })
      }
    } catch (error) {
      console.error("Error:", error)
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }
  }

  return Response.json({ success: false }, { status: 400 })
}

export default function AutomationsPage() {
  const { automations: initialAutomations, templates } = useLoaderData()
  const fetcher = useFetcher()
  const [showForm, setShowForm] = useState(false)
  const [automations, setAutomations] = useState(initialAutomations)

  useEffect(() => {
    if (fetcher.data?.success) {
      if (fetcher.formData?.get("actionType") === "create") {
        setAutomations([fetcher.data.automation, ...automations])
        setShowForm(false)
      } else if (fetcher.formData?.get("actionType") === "delete") {
        const id = fetcher.formData.get("automationId")
        setAutomations(automations.filter((a) => a.id !== id))
      } else if (fetcher.formData?.get("actionType") === "toggle") {
        setAutomations(automations.map((a) => (a.id === fetcher.data.automation.id ? fetcher.data.automation : a)))
      }
    }
  }, [fetcher.data])

  const triggers = ["order_created", "order_shipped", "order_delivered", "cart_abandoned", "cod_pending"]

  return (
    <s-page heading="Automation Rules">
      <s-button slot="primary-action" onClick={() => setShowForm(!showForm)}>
        Create Automation
      </s-button>

      {showForm && (
        <s-section heading="Create New Automation">
          <fetcher.Form method="post">
            <s-stack direction="block" gap="base">
              <s-form-layout>
                <s-text-field label="Automation Name" name="name" required />
                <s-select
                  label="Trigger Event"
                  name="trigger"
                  options={triggers.map((trig) => ({
                    label: trig.replace(/_/g, " ").toUpperCase(),
                    value: trig,
                  }))}
                  required
                />
                <s-select
                  label="Message Template"
                  name="templateId"
                  options={templates.map((template) => ({
                    label: template.name,
                    value: template.id,
                  }))}
                  required
                />
                <s-button submit>Save Automation</s-button>
              </s-form-layout>
              <input type="hidden" name="actionType" value="create" />
            </s-stack>
          </fetcher.Form>
        </s-section>
      )}

      <s-section heading={`Active Automations (${automations.length})`}>
        {automations.length === 0 ? (
          <s-paragraph>No automations configured yet.</s-paragraph>
        ) : (
          <s-resource-list
            resourceName={{ singular: "automation", plural: "automations" }}
            items={automations}
            renderItem={(automation) => (
              <s-resource-item id={automation.id} accessibilityLabel={automation.name}>
                <s-heading level="3">{automation.name}</s-heading>
                <s-text>Trigger: {automation.trigger.replace(/_/g, " ").toUpperCase()}</s-text>
                <s-text>Template: {automation.template?.name}</s-text>
                <s-badge status={automation.isActive ? "success" : "warning"}>
                  {automation.isActive ? "Active" : "Inactive"}
                </s-badge>
                <s-button-group>
                  <s-button
                    size="small"
                    onClick={() => {
                      fetcher.submit({ actionType: "toggle", automationId: automation.id }, { method: "POST" })
                    }}
                  >
                    {automation.isActive ? "Disable" : "Enable"}
                  </s-button>
                  <s-button
                    size="small"
                    variant="critical"
                    onClick={() => {
                      fetcher.submit({ actionType: "delete", automationId: automation.id }, { method: "POST" })
                    }}
                  >
                    Delete
                  </s-button>
                </s-button-group>
              </s-resource-item>
            )}
          />
        )}
      </s-section>
    </s-page>
  )
}
