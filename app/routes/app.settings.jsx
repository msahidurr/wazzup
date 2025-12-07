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
    const credential = await prisma.whatsAppCredential.findFirst({
      where: { shop: { shopDomain: shopId } },
    })
    const billing = await prisma.billingUsage.findFirst({
      where: { shop: { shopDomain: shopId } },
    })
    return { credential, billing }
  } catch (error) {
    console.error("Error loading settings:", error)
    return { credential: null, billing: null }
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
    const phoneNumberId = formData.get("phoneNumberId")
    const businessAccountId = formData.get("businessAccountId")
    const accessToken = formData.get("accessToken")

    try {
      const credential = await prisma.whatsAppCredential.upsert({
        where: { shopId },
        update: {
          phoneNumberId,
          businessAccountId,
          accessToken,
        },
        create: {
          phoneNumberId,
          businessAccountId,
          accessToken,
          shop: { connect: { shopDomain: shopId } },
        },
      })
      return { success: true, credential }
    } catch (error) {
      console.error("Error saving credentials:", error)
      return { success: false, error: "Failed to save credentials" }
    }
  }

  return { success: false }
}

export default function SettingsPage() {
  const { credential, billing } = useLoaderData()
  const fetcher = useFetcher()
  const [showForm, setShowForm] = useState(false)

  return (
    <s-page heading="Settings">
      <s-section heading="WhatsApp Cloud API Credentials">
        {credential ? (
          <s-box padding="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="base">
              <s-paragraph>
                <strong>Phone Number ID:</strong> {credential.phoneNumberId}
              </s-paragraph>
              <s-paragraph>
                <strong>Business Account ID:</strong> {credential.businessAccountId}
              </s-paragraph>
              <s-paragraph>
                <strong>Status:</strong>{" "}
                <s-badge status={credential.isActive ? "success" : "warning"}>
                  {credential.isActive ? "Active" : "Inactive"}
                </s-badge>
              </s-paragraph>
              <s-button onClick={() => setShowForm(!showForm)}>Update Credentials</s-button>
            </s-stack>
          </s-box>
        ) : (
          <s-paragraph>No credentials configured yet.</s-paragraph>
        )}

        {showForm && (
          <fetcher.Form method="post">
            <s-section heading="Update WhatsApp Credentials">
              <s-stack direction="block" gap="base">
                <s-form-layout>
                  <s-text-field
                    label="Phone Number ID"
                    name="phoneNumberId"
                    defaultValue={credential?.phoneNumberId || ""}
                    required
                  />
                  <s-text-field
                    label="Business Account ID"
                    name="businessAccountId"
                    defaultValue={credential?.businessAccountId || ""}
                    required
                  />
                  <s-text-field
                    label="Access Token"
                    name="accessToken"
                    type="password"
                    defaultValue={credential?.accessToken || ""}
                    required
                    helpText="Keep this secure"
                  />
                  <s-button submit>Save Credentials</s-button>
                </s-form-layout>
              </s-stack>
            </s-section>
          </fetcher.Form>
        )}
      </s-section>

      <s-section heading="Billing">
        {billing ? (
          <s-box padding="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="base">
              <s-paragraph>
                <strong>Plan:</strong> {billing.tier}
              </s-paragraph>
              <s-paragraph>
                <strong>Monthly Quota:</strong> {billing.messagesQuota} messages
              </s-paragraph>
              <s-paragraph>
                <strong>Messages Sent:</strong> {billing.messagesSent} / {billing.messagesQuota}
              </s-paragraph>
              <s-progress value={(billing.messagesSent / billing.messagesQuota) * 100} />
            </s-stack>
          </s-box>
        ) : (
          <s-paragraph>No billing information available.</s-paragraph>
        )}
      </s-section>
    </s-page>
  )
}
