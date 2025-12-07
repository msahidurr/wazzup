"use client"

import { useLoaderData, useFetcher } from "react-router"
import { useState } from "react"
import { authenticate } from "../shopify.server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request)
  const shopId = session?.shop

  if (!shopId) {
    throw new Response("Unauthorized", { status: 401 })
  }

  try {
    const automations = await prisma.automationRule.findMany({
      where: { shop: { shopDomain: shopId } },
      include: { template: true },
      orderBy: { createdAt: "desc" },
    })
    const templates = await prisma.messageTemplate.findMany({
      where: { shop: { shopDomain: shopId } },
    })
    return { automations, templates }
  } catch (error) {
    console.error("Error loading automations:", error)
    return { automations: [], templates: [] }
  }
}

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request)
  const shopId = session?.shop

  if (!shopId) {
    throw new Response("Unauthorized", { status: 401 })
  }

  if (request.method === "POST") {
    const formData = await request.formData()
    const name = formData.get("name")
    const trigger = formData.get("trigger")
    const templateId = formData.get("templateId")

    try {
      const automation = await prisma.automationRule.create({
        data: {
          name,
          trigger,
          templateId,
          shop: { connect: { shopDomain: shopId } },
        },
        include: { template: true },
      })
      return { success: true, automation }
    } catch (error) {
      console.error("Error creating automation:", error)
      return { success: false, error: "Failed to create automation" }
    }
  }

  return { success: false }
}

export default function AutomationsPage() {
  const { automations, templates } = useLoaderData()
  const fetcher = useFetcher()
  const [showForm, setShowForm] = useState(false)

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
                    label: trig.replace(/_/g, " "),
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
                <s-text>Trigger: {automation.trigger}</s-text>
                <s-text>Template: {automation.template?.name}</s-text>
              </s-resource-item>
            )}
          />
        )}
      </s-section>
    </s-page>
  )
}
