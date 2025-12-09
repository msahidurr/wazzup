export default function HelpPage() {
  return (
    <s-page heading="Help & Documentation">
      <s-section heading="Getting Started">
        <s-unordered-list>
          <s-list-item>
            <s-link href="#onboarding">Complete Onboarding</s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="#templates">Create Message Templates</s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="#automations">Set Up Automations</s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="#widget">Install Storefront Widget</s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section id="templates" heading="Message Templates">
        <s-paragraph>
          Message templates are pre-written messages you can use for automations. Use variables in double curly braces:
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>{"{{customer_name}}"} - Customer's name</s-list-item>
          <s-list-item>{"{{order_id}}"} - Order number</s-list-item>
          <s-list-item>{"{{amount}}"} - Order amount</s-list-item>
          <s-list-item>{"{{tracking_url}}"} - Tracking link</s-list-item>
          <s-list-item>{"{{item_count}}"} - Number of items</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section id="automations" heading="Automation Rules">
        <s-paragraph>Automations send messages automatically based on events:</s-paragraph>
        <s-unordered-list>
          <s-list-item>
            <strong>Order Created</strong> - Sent when customer places an order
          </s-list-item>
          <s-list-item>
            <strong>Order Shipped</strong> - Sent when order is marked as shipped
          </s-list-item>
          <s-list-item>
            <strong>Order Delivered</strong> - Sent when delivery is confirmed
          </s-list-item>
          <s-list-item>
            <strong>Cart Abandoned</strong> - Sent when checkout is abandoned
          </s-list-item>
          <s-list-item>
            <strong>COD Verification</strong> - Sent to verify cash on delivery
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Frequently Asked Questions">
        <s-heading level="3">How do I format phone numbers?</s-heading>
        <s-paragraph>
          Phone numbers must be in E.164 format: +[country code][number] Example: +16175551234 for US, +442071838750 for
          UK
        </s-paragraph>

        <s-heading level="3">What's the message rate limit?</s-heading>
        <s-paragraph>
          WhatsApp Cloud API limits outgoing messages to 1 per 50 milliseconds per number. Batch sends are automatically
          rate-limited.
        </s-paragraph>

        <s-heading level="3">Can I schedule messages?</s-heading>
        <s-paragraph>
          Yes, automations can include delay settings to send messages at specific times after an event triggers.
        </s-paragraph>

        <s-heading level="3">How do I view message delivery status?</s-heading>
        <s-paragraph>
          Check the Analytics page to view all messages and their delivery status (sent, delivered, failed).
        </s-paragraph>

        <s-heading level="3">What happens if my quota is exceeded?</s-heading>
        <s-paragraph>
          Upgrade your plan to increase your monthly message quota. Check Settings → Billing to see your current usage.
        </s-paragraph>
      </s-section>

      <s-section heading="Support">
        <s-paragraph>For additional help, contact our support team at support@wazzup.app</s-paragraph>
      </s-section>
    </s-page>
  )
}
