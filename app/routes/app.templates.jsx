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

    const [templates, categories] = await Promise.all([
      prisma.messageTemplate.findMany({
        where: { shopId: shop.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.templateCategory.findMany({
        where: { shopId: shop.id },
        orderBy: { createdAt: "asc" },
      }),
    ])
    return { templates, categories }
  } catch (error) {
    console.error("Error loading templates:", error)
    return { templates: [], categories: [] }
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
      if (actionType === "create-category") {
        const newCategory = formData.get("newCategory")?.trim()

        if (!newCategory) {
          return Response.json({ success: false, error: "Category name is required" }, { status: 400 })
        }

        const existingCategory = await prisma.templateCategory.findFirst({
          where: {
            shopId: shop.id,
            name: newCategory,
          },
        })

        if (existingCategory) {
          return Response.json({ success: false, error: "Category already exists" }, { status: 400 })
        }

        const createdCategory = await prisma.templateCategory.create({
          data: {
            name: newCategory,
            shopId: shop.id,
          },
        })
        return Response.json({ success: true, category: createdCategory })
      }

      if (actionType === "create-template") {
        const name = formData.get("name")?.trim()
        const category = formData.get("category")
        const content = formData.get("content")?.trim()

        if (!name) {
          
          return Response.json({ success: false, error: "Template name is required" }, { status: 400 })
        }
        if (!category) {
          return Response.json({ success: false, error: "Category is required" }, { status: 400 })
        }
        if (!content) {
          return Response.json({ success: false, error: "Message content is required" }, { status: 400 })
        }
        if (content.length > 1024) {
          return Response.json({ success: false, error: "Message must be under 1024 characters" }, { status: 400 })
        }

        const template = await prisma.messageTemplate.create({
          data: {
            name,
            category,
            content,
            shopId: shop.id,
          },
        })
        return Response.json({ success: true, template })
      }

      if (actionType === "delete-template") {
        const templateId = formData.get("templateId")
        await prisma.messageTemplate.delete({
          where: { id: templateId },
        })
        return Response.json({ success: true })
      }

      if (actionType === "update-template") {
        const templateId = formData.get("templateId")
        const name = formData.get("name")?.trim()
        const category = formData.get("category")
        const content = formData.get("content")?.trim()

        const updated = await prisma.messageTemplate.update({
          where: { id: templateId },
          data: { name, category, content },
        })
        return Response.json({ success: true, template: updated })
      }
    } catch (error) {
      console.error("Error:", error)
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }
  }

  return Response.json({ success: false }, { status: 400 })
}

export default function TemplatesPage() {
  const { templates: initialTemplates, categories: initialCategories } = useLoaderData()
  const categoryFetcher = useFetcher()
  const templateFetcher = useFetcher()
  const [showForm, setShowForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [categories, setCategories] = useState(initialCategories)
  const [templates, setTemplates] = useState(initialTemplates)
  const [categoryError, setCategoryError] = useState("")
  const [editingTemplate, setEditingTemplate] = useState(null)

  useEffect(() => {
    if (categoryFetcher.data?.success) {
      setCategories([...categories, categoryFetcher.data.category])
      setShowCategoryForm(false)
      setCategoryError("")
    } else if (categoryFetcher.data?.error) {
      setCategoryError(categoryFetcher.data.error)
    }
  }, [categoryFetcher.data])

  useEffect(() => {
    if (templateFetcher.data?.success) {
      if (editingTemplate) {
        setTemplates(templates.map((t) => (t.id === editingTemplate.id ? templateFetcher.data.template : t)))
        setEditingTemplate(null)
      } else {
        setTemplates([templateFetcher.data.template, ...templates])
      }
      setShowForm(false)
    }
  }, [templateFetcher.data])

  const defaultCategories = [
    { label: "Order Confirmation", value: "order_confirmation" },
    { label: "Shipping Update", value: "shipping_update" },
    { label: "Delivery Update", value: "delivery_update" },
    { label: "Abandoned Cart", value: "abandoned_cart" },
    { label: "COD Verification", value: "cod_verification" },
  ]

  const allCategories = [
    ...defaultCategories,
    ...(categories?.map((cat) => ({ label: cat.name, value: cat.name })) || []),
  ]

  return (
    <s-page heading="Message Templates">
      <s-button
        slot="primary-action"
        onClick={() => {
          setShowForm(!showForm)
          setEditingTemplate(null)
        }}
      >
        Create Template
      </s-button>

      {showForm && (
        <s-section heading={editingTemplate ? "Edit Template" : "Create New Template"}>
          <s-stack direction="block" gap="base">
            <s-card>
              <s-stack direction="block" gap="tight">
                <s-text appearance="subdued">Don't see your category? Create a new one first.</s-text>
                <s-button size="small" onClick={() => setShowCategoryForm(!showCategoryForm)}>
                  {showCategoryForm ? "Hide" : "Create New Category"}
                </s-button>

                {showCategoryForm && (
                  <>
                    {categoryError && <s-banner tone="critical">{categoryError}</s-banner>}
                    {categoryFetcher.data?.success && (
                      <s-banner tone="success">Category created successfully!</s-banner>
                    )}

                    <categoryFetcher.Form method="post">
                      <s-form-layout>
                        <s-text-field
                          label="New Category Name"
                          name="newCategory"
                          placeholder="e.g., Product Review Request"
                          disabled={categoryFetcher.state === "submitting"}
                        />
                        <s-button submit disabled={categoryFetcher.state === "submitting"}>
                          {categoryFetcher.state === "submitting" ? "Adding..." : "Add Category"}
                        </s-button>
                        <input type="hidden" name="actionType" value="create-category" />
                      </s-form-layout>
                    </categoryFetcher.Form>
                  </>
                )}
              </s-stack>
            </s-card>

            <templateFetcher.Form method="post">
              <s-stack direction="block" gap="base">
                <s-form-layout>
                  <s-text-field label="Template Name" name="name" defaultValue={editingTemplate?.name || ""} required />
                  <s-select
                    label="Category"
                    name="category"
                    options={allCategories}
                    required
                    value={editingTemplate?.category || selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  />
                  <s-text-field
                    label="Message Content"
                    name="content"
                    multiline
                    defaultValue={editingTemplate?.content || ""}
                    required
                    helpText="Use {{variable}} for dynamic content"
                  />
                  <s-button submit>{editingTemplate ? "Update" : "Create"} Template</s-button>
                  {editingTemplate && (
                    <s-button onClick={() => setEditingTemplate(null)} variant="secondary">
                      Cancel
                    </s-button>
                  )}
                </s-form-layout>
              </s-stack>
              <input type="hidden" name="actionType" value={editingTemplate ? "update-template" : "create-template"} />
              {editingTemplate && <input type="hidden" name="templateId" value={editingTemplate.id} />}
            </templateFetcher.Form>
          </s-stack>
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
                <s-button-group>
                  <s-button
                    size="small"
                    onClick={() => {
                      setEditingTemplate(template)
                      setShowForm(true)
                    }}
                  >
                    Edit
                  </s-button>
                  <s-button
                    size="small"
                    variant="critical"
                    onClick={() => {
                      templateFetcher.submit(
                        { actionType: "delete-template", templateId: template.id },
                        { method: "POST" },
                      )
                      setTemplates(templates.filter((t) => t.id !== template.id))
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
