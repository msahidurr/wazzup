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
    const templates = await prisma.messageTemplate.findMany({
      where: { shop: { shopDomain: shopId } },
      orderBy: { createdAt: "desc" },
    })
    return { templates }
  } catch (error) {
    console.error("Error loading templates:", error)
    return { templates: [] }
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
    const category = formData.get("category")
    const content = formData.get("content")

    try {
      const template = await prisma.messageTemplate.create({
        data: {
          name,
          category,
          content,
          shop: { connect: { shopDomain: shopId } },
        },
      })
      return { success: true, template }
    } catch (error) {
      console.error("Error creating template:", error)
      return { success: false, error: "Failed to create template" }
    }
  }

  return { success: false }
}

export default function TemplatesPage() {
  const { templates } = useLoaderData()
  const fetcher = useFetcher()
  const [showForm, setShowForm] = useState(false)

  const categories = [
    "order_confirmation",
    "shipping_update",
    "delivery_update",
    "abandoned_cart",
    "cod_verification",
    "custom",
  ]

  return (
    <s-page heading="Message Templates">
      <s-button slot="primary-action" onClick={() => setShowForm(!showForm)}>
        Create Template
      </s-button>

      {showForm && (
        <s-section heading="Create New Template">
          <fetcher.Form method="post">
            <s-stack direction="block" gap="base">
              <s-form-layout>
                <s-text-field label="Template Name" name="name" required />
                <s-select
                  label="Category"
                  name="category"
                  options={categories.map((cat) => ({
                    label: cat.replace(/_/g, " "),
                    value: cat,
                  }))}
                  required
                />
                <s-text-field
                  label="Message Content"
                  name="content"
                  multiline
                  required
                  helpText="Use {{variable}} for dynamic content"
                />
                <s-button submit onClick={() => fetcher.submit({ method: "POST" }, { method: "POST" })}>
                  Save Template
                </s-button>
              </s-form-layout>
            </s-stack>
          </fetcher.Form>
        </s-section>
      )}

      <s-section heading={`Templates (${templates.length})`}>
        {templates.length === 0 ? (
          <s-paragraph>No templates created yet.</s-paragraph>
        ) : (
          <s-resource-list
            resourceName={{ singular: "template", plural: "templates" }}
            items={templates}
            renderItem={(template) => (
              <s-resource-item id={template.id} accessibilityLabel={template.name}>
                <s-heading level="3">{template.name}</s-heading>
                <s-text>Category: {template.category}</s-text>
                <s-text>{template.content}</s-text>
              </s-resource-item>
            )}
          />
        )}
      </s-section>
    </s-page>
  )
}
