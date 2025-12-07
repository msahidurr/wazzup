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
    const shop = await prisma.shop.findUnique({
      where: { shopDomain: shopId },
    })
    const credential = await prisma.whatsAppCredential.findFirst({
      where: { shop: { shopDomain: shopId } },
    })
    const billing = await prisma.billingUsage.findFirst({
      where: { shop: { shopDomain: shopId } },
    })

    return {
      shopExists: !!shop,
      credentialsExists: !!credential,
      billingExists: !!billing,
      shop,
    }
  } catch (error) {
    console.error("Error loading onboarding:", error)
    return {
      shopExists: false,
      credentialsExists: false,
      billingExists: false,
    }
  }
}

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request)
  const shopId = session?.shop

  if (!shopId) {
    throw new Response("Unauthorized", { status: 401 })
  }

  if (request.method === "POST") {
    const formData = await request.formData()
    const step = formData.get("step")

    try {
      if (step === "create-shop") {
        const shopResponse = await admin.graphql(`
          query {
            shop {
              id
              name
              email
              myshopifyDomain
            }
          }
        `)
        const shopData = await shopResponse.json()
        const shopInfo = shopData.data.shop

        const shop = await prisma.shop.upsert({
          where: { shopDomain: shopId },
          update: {},
          create: {
            shopName: shopInfo.name,
            shopDomain: shopId,
            shopifyAccessToken: session?.accessToken || "",
          },
        })

        // Create default billing tier
        await prisma.billingUsage.upsert({
          where: { shopId: shop.id },
          update: {},
          create: {
            shopId: shop.id,
            tier: "free",
            messagesQuota: 1000,
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        })

        return { success: true, shop }
      }

      if (step === "setup-whatsapp") {
        const phoneNumberId = formData.get("phoneNumberId")
        const businessAccountId = formData.get("businessAccountId")
        const accessToken = formData.get("accessToken")

        const shop = await prisma.shop.findFirst({
          where: { shopDomain: shopId },
        })

        if (!shop) {
          return { success: false, error: "Shop not found" }
        }

        const credential = await prisma.whatsAppCredential.upsert({
          where: { shopId: shop.id },
          update: {
            phoneNumberId,
            businessAccountId,
            accessToken,
          },
          create: {
            shopId: shop.id,
            phoneNumberId,
            businessAccountId,
            accessToken,
          },
        })

        return { success: true, credential }
      }
    } catch (error) {
      console.error("Error in onboarding action:", error)
      return { success: false, error: error.message }
    }
  }

  return { success: false }
}

export default function OnboardingPage() {
  const { shopExists, credentialsExists, billingExists } = useLoaderData()
  const fetcher = useFetcher()
  const [currentStep, setCurrentStep] = useState(shopExists ? (credentialsExists ? 2 : 1) : 0)

  const handleStepOne = () => {
    fetcher.submit({ step: "create-shop" }, { method: "POST" })
    setCurrentStep(1)
  }

  const handleStepTwo = (phoneNumberId, businessAccountId, accessToken) => {
    fetcher.submit(
      {
        step: "setup-whatsapp",
        phoneNumberId,
        businessAccountId,
        accessToken,
      },
      { method: "POST" },
    )
    setCurrentStep(2)
  }

  return (
    <s-page heading="WhatsApp Setup Wizard">
      <s-section heading="Setup Progress">
        <s-stack direction="inline" gap="base">
          <s-box padding="base" borderRadius="base" background={currentStep >= 0 ? "highlight" : "subdued"}>
            <s-heading level="3">Step 1: Connect Shop</s-heading>
            <s-text>{shopExists ? "✓ Complete" : "Pending"}</s-text>
          </s-box>
          <s-box padding="base" borderRadius="base" background={currentStep >= 1 ? "highlight" : "subdued"}>
            <s-heading level="3">Step 2: WhatsApp Credentials</s-heading>
            <s-text>{credentialsExists ? "✓ Complete" : "Pending"}</s-text>
          </s-box>
          <s-box padding="base" borderRadius="base" background={currentStep >= 2 ? "highlight" : "subdued"}>
            <s-heading level="3">Step 3: Create Templates</s-heading>
            <s-text>Pending</s-text>
          </s-box>
        </s-stack>
      </s-section>

      {currentStep === 0 && (
        <s-section heading="Step 1: Connect Your Shopify Store">
          <s-paragraph>We'll securely connect your Shopify store and save your merchant details.</s-paragraph>
          <s-button onClick={handleStepOne}>Connect Store</s-button>
        </s-section>
      )}

      {currentStep === 1 && (
        <s-section heading="Step 2: Add WhatsApp Cloud API Credentials">
          <s-paragraph>Enter your WhatsApp Cloud API credentials from your Meta Business Account.</s-paragraph>
          <fetcher.Form method="post">
            <input type="hidden" name="step" value="setup-whatsapp" />
            <s-form-layout>
              <s-text-field
                label="Phone Number ID"
                name="phoneNumberId"
                helpText="From your WhatsApp Business Account"
                required
              />
              <s-text-field
                label="Business Account ID"
                name="businessAccountId"
                helpText="Meta Business Account ID"
                required
              />
              <s-text-field
                label="Access Token"
                name="accessToken"
                type="password"
                helpText="Generated from your Meta app"
                required
              />
              <s-button submit>Save Credentials</s-button>
            </s-form-layout>
          </fetcher.Form>
        </s-section>
      )}

      {currentStep === 2 && (
        <s-section heading="Setup Complete!">
          <s-paragraph>Your WhatsApp automation app is now configured. You can:</s-paragraph>
          <s-unordered-list>
            <s-list-item>Create message templates</s-list-item>
            <s-list-item>Set up automation rules</s-list-item>
            <s-list-item>Monitor customer chats</s-list-item>
            <s-list-item>View delivery analytics</s-list-item>
          </s-unordered-list>
          <s-button href="/app">Go to Dashboard</s-button>
        </s-section>
      )}
    </s-page>
  )
}
