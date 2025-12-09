import { PrismaClient } from "@prisma/client"
import { authenticate } from "../../shopify.server"

const prisma = new PrismaClient()

const PREBUILT_TEMPLATES = [
  {
    name: "Order Confirmation",
    category: "order_confirmation",
    content: `Thank you {{customer_name}}! Your order #{{order_id}} has been confirmed. Total: {{amount}}. Track your delivery: {{tracking_url}}`,
  },
  {
    name: "Order Shipped",
    category: "shipping_update",
    content: `Great news {{customer_name}}! Your order #{{order_id}} has been shipped. Track it here: {{tracking_url}}`,
  },
  {
    name: "Order Delivered",
    category: "delivery_update",
    content: `Your order #{{order_id}} has been delivered! Thank you for shopping with us, {{customer_name}}.`,
  },
  {
    name: "Abandoned Cart Recovery",
    category: "abandoned_cart",
    content: `Hi {{customer_name}}, you left {{item_count}} item(s) in your cart. Complete your purchase: {{cart_url}}`,
  },
  {
    name: "COD Verification",
    category: "cod_verification",
    content: `Hi {{customer_name}}, please confirm your Cash on Delivery order #{{order_id}} for {{amount}}. Reply with YES to confirm.`,
  },
  {
    name: "Order Update",
    category: "custom",
    content: `{{customer_name}}, {{message}}`,
  },
]

export async function loader({ request }) {
  return Response.json({ templates: PREBUILT_TEMPLATES })
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request)
  const shopId = session?.shop

  if (!shopId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (request.method === "POST") {
    const { templateNames } = await request.json()

    try {
      const shop = await prisma.shop.findFirst({
        where: { shopDomain: shopId },
      })

      if (!shop) {
        return Response.json({ error: "Shop not found" }, { status: 404 })
      }

      const created = []

      for (const name of templateNames) {
        const template = PREBUILT_TEMPLATES.find((t) => t.name === name)
        if (template) {
          const existing = await prisma.messageTemplate.findFirst({
            where: {
              shopId: shop.id,
              name: template.name,
            },
          })

          if (!existing) {
            const created_template = await prisma.messageTemplate.create({
              data: {
                ...template,
                shopId: shop.id,
                isPrebuilt: true,
              },
            })
            created.push(created_template)
          }
        }
      }

      return Response.json({ success: true, created })
    } catch (error) {
      console.error("Error creating prebuilt templates:", error)
      return Response.json({ error: "Failed to create templates" }, { status: 500 })
    }
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 })
}
