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
    const sessions = await prisma.chatSession.findMany({
      where: { shop: { shopDomain: shopId } },
      include: {
        messages: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    })
    return { sessions }
  } catch (error) {
    console.error("Error loading chat sessions:", error)
    return { sessions: [] }
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
    const sessionId = formData.get("sessionId")
    const content = formData.get("content")

    try {
      const message = await prisma.chatMessage.create({
        data: {
          chatSessionId: sessionId,
          sender: "agent",
          content,
        },
      })
      return { success: true, message }
    } catch (error) {
      console.error("Error sending message:", error)
      return { success: false, error: "Failed to send message" }
    }
  }

  return { success: false }
}

export default function ChatPage() {
  const { sessions } = useLoaderData()
  const [selectedSession, setSelectedSession] = useState(sessions[0]?.id || null)
  const fetcher = useFetcher()

  const currentSession = sessions.find((s) => s.id === selectedSession)

  return (
    <s-page heading="Customer Support Chat">
      <s-layout>
        <s-layout-section>
          <s-section heading="Chat Sessions">
            {sessions.length === 0 ? (
              <s-paragraph>No chat sessions yet.</s-paragraph>
            ) : (
              <s-stack direction="block" gap="base">
                {sessions.map((session) => (
                  <s-box
                    key={session.id}
                    padding="base"
                    borderRadius="base"
                    background={selectedSession === session.id ? "subdued" : "transparent"}
                    onClick={() => setSelectedSession(session.id)}
                  >
                    <s-heading level="4">{session.customerName}</s-heading>
                    <s-text>{session.customerPhone}</s-text>
                    <s-badge status={session.status}>{session.status}</s-badge>
                  </s-box>
                ))}
              </s-stack>
            )}
          </s-section>
        </s-layout-section>

        <s-layout-section>
          {currentSession ? (
            <s-section heading={`Chat with ${currentSession.customerName}`}>
              <s-stack direction="block" gap="base">
                {currentSession.messages &&
                  currentSession.messages
                    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                    .map((msg) => (
                      <s-box
                        key={msg.id}
                        padding="base"
                        borderRadius="base"
                        background={msg.sender === "agent" ? "subdued" : "highlight"}
                      >
                        <s-text>
                          <strong>{msg.sender === "agent" ? "You" : currentSession.customerName}:</strong> {msg.content}
                        </s-text>
                      </s-box>
                    ))}

                <fetcher.Form method="post">
                  <input type="hidden" name="sessionId" value={selectedSession} />
                  <s-form-layout>
                    <s-text-field label="Message" name="content" multiline placeholder="Type your response..." />
                    <s-button submit>Send</s-button>
                  </s-form-layout>
                </fetcher.Form>
              </s-stack>
            </s-section>
          ) : (
            <s-section heading="Select a chat session">
              <s-paragraph>Select a chat session to view and respond to messages.</s-paragraph>
            </s-section>
          )}
        </s-layout-section>
      </s-layout>
    </s-page>
  )
}
