<script setup lang="ts">
// Contact form. Shares its shape and copy with the campaigns-server feedback
// form (app/pages/feedback.vue there) — a required message category, the same
// field labels and placeholders, a consent switch and a full-width submit —
// because both open the same kind of inbox conversation. The category is sent
// on as the campaigns-server `feedback_type`, while `source: doxa_life` (added
// by the server proxy) keeps these messages identifiable in the inbox.
//
// The form posts to our server proxy at /api/contact which verifies the
// Turnstile token and forwards to pray.doxa.life. Turnstile runs in
// interaction-only mode, so it stays invisible unless Cloudflare decides the
// visitor actually needs to be challenged.

import type { MessageType } from '~/types/contact'

const { t, locale } = useI18n()

const messageType = ref<MessageType | null>(null)
const name = ref('')
const email = ref('')
const honeypot = ref('') // matches the `name="email"` trap in the PHP template
const message = ref('')
const consent = ref(false)
const turnstileToken = ref('')

const submitting = ref(false)

const typeError = ref('')
const emailError = ref('')
const messageError = ref('')

const messageText = ref('')
const messageClass = ref<'success' | 'error' | ''>('')
const formRef = ref<HTMLFormElement | null>(null)
const turnstileRef = ref<{ reset: () => void } | null>(null)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function onSubmit(e: Event) {
  e.preventDefault()
  if (honeypot.value) return

  typeError.value = ''
  emailError.value = ''
  messageError.value = ''
  messageText.value = ''
  messageClass.value = ''

  const trimmedEmail = email.value.trim()
  const trimmedMessage = message.value.trim()
  let valid = true
  if (!messageType.value) {
    typeError.value = t('Please choose what your message is about.')
    valid = false
  }
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    emailError.value = t('Please enter a valid email address.')
    valid = false
  }
  if (!trimmedMessage) {
    messageError.value = t('Please enter a message.')
    valid = false
  }
  if (!valid) return

  // The widget is invisible and re-arms itself periodically, so a missing token
  // means "not ready yet" rather than "failed" — say so instead of letting the
  // proxy reject the submission with a generic error.
  if (!turnstileToken.value) {
    messageClass.value = 'error'
    messageText.value = t('Verification is still loading. Please try again in a moment.')
    return
  }

  submitting.value = true

  try {
    const response = await $fetch<{ status: string, message?: string }>('/api/contact', {
      method: 'POST',
      body: {
        name: name.value,
        email: trimmedEmail,
        message: trimmedMessage,
        message_type: messageType.value,
        consent_doxa_general: consent.value,
        language: locale.value,
        cf_turnstile: turnstileToken.value
      }
    })

    if (response?.status === 'success') {
      messageClass.value = 'success'
      messageText.value = t('Thank you for your message. We will get back to you soon!')
      window.goStats?.track('contact_submit', { metadata: { language: locale.value, message_type: messageType.value } })
      messageType.value = null
      name.value = ''
      email.value = ''
      message.value = ''
      consent.value = false
      formRef.value?.reset()
    } else {
      messageClass.value = 'error'
      messageText.value = response?.message ?? t('There was an error sending your message. Please try again.')
    }
  } catch (err: any) {
    messageClass.value = 'error'
    messageText.value = err?.data?.message ?? t('There was an error sending your message. Please try again.')
  } finally {
    submitting.value = false
    turnstileToken.value = ''
    turnstileRef.value?.reset()
  }
}
</script>

<template>
  <div class="container page-content max-width-lg">
    <h1 class="page-title">
      {{ t('Contact Us') }}
    </h1>
    <p class="center contact-intro">
      {{ t("We'd love to hear from you — tell us what you love, share a suggestion, or report a problem.") }}
    </p>

    <form
      id="contact-form"
      ref="formRef"
      class="stack stack--md center form--quiet"
      novalidate
      @submit="onSubmit"
    >
      <input
        type="hidden"
        name="action"
        value="contact_us"
      >
      <input
        v-model="honeypot"
        type="email"
        name="email"
        style="display:none;"
        autocomplete="off"
        tabindex="-1"
      >

      <div class="">
        <span
          id="message-type-label"
          class="field-label"
        >
          {{ t('What is your message about?') }}<span
            class="required-marker"
            aria-hidden="true"
          >*</span>
        </span>
        <MessageTypeSelect
          v-model="messageType"
          label-id="message-type-label"
        />
        <p
          v-if="typeError"
          class="field-error"
        >
          {{ typeError }}
        </p>
      </div>

      <div class="">
        <label for="name">{{ t('Name') }}</label>
        <input
          id="name"
          v-model="name"
          type="text"
          name="name"
          :placeholder="t('Your name (optional)')"
        >
      </div>

      <div class="">
        <label for="contact_email">
          {{ t('Email') }}<span
            class="required-marker"
            aria-hidden="true"
          >*</span>
        </label>
        <input
          id="contact_email"
          v-model="email"
          type="email"
          name="contact_email"
          required
          :placeholder="t('Enter your email')"
        >
        <p
          v-if="emailError"
          class="field-error"
        >
          {{ emailError }}
        </p>
      </div>

      <div class="">
        <label for="message">
          {{ t('Message') }}<span
            class="required-marker"
            aria-hidden="true"
          >*</span>
        </label>
        <textarea
          id="message"
          v-model="message"
          name="message"
          rows="5"
          required
          :placeholder="t('Tell us more…')"
        />
        <p
          v-if="messageError"
          class="field-error"
        >
          {{ messageError }}
        </p>
      </div>

      <div class="form-consent">
        <ToggleSwitch
          v-model="consent"
          label-id="consent-doxa-general"
        />
        <span
          id="consent-doxa-general"
          class="form-consent__label"
          @click="consent = !consent"
        >
          {{ t("I'd like to receive email updates from the DOXA partnership.") }}
        </span>
      </div>

      <NuxtTurnstile
        ref="turnstileRef"
        v-model="turnstileToken"
        :options="{ theme: 'light', appearance: 'interaction-only' }"
      />

      <div
        id="contact-message"
        class="contact-message"
        :class="messageClass"
        :style="{ display: messageText ? 'block' : 'none' }"
      >
        {{ messageText }}
      </div>

      <button
        id="contact-submit"
        type="submit"
        class="button width-100"
        :disabled="submitting"
      >
        {{ submitting ? t('Sending…') : t('Send message') }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.contact-intro {
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-lg);
}

/* Matches the weight and spacing of the <label>s the other fields use, for the
   one field whose control is a button group rather than a labelable input. */
.field-label {
  display: block;
}

/* `.button` centres nothing by default because it is sized to its content; as a
   full-width submit it needs its own text centring. */
#contact-submit {
  text-align: center;
}
</style>
