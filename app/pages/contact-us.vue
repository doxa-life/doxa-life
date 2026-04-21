<script setup lang="ts">
// Port of marketing-theme/page-contact.php.
// Markup, classes, field names, labels, placeholders, and submit flow
// mirror the source exactly. The Turnstile widget is rendered via the
// @nuxtjs/turnstile module; the form submits to our server proxy at
// /api/contact which verifies the token and forwards to pray.doxa.life.

import { COUNTRIES } from '~/utils/countries'

const { t, locale } = useI18n()

const name = ref('')
const email = ref('')
const honeypot = ref('') // matches the `name="email"` trap in the PHP template
const country = ref('')
const message = ref('')
const consent = ref(false)
const turnstileToken = ref('')

const submitting = ref(false)
const submitDisabled = computed(() => submitting.value || !turnstileToken.value)

const messageEl = ref<HTMLDivElement | null>(null)
const messageText = ref('')
const messageClass = ref<'success' | 'error' | ''>('')
const formRef = ref<HTMLFormElement | null>(null)
const turnstileRef = ref<{ reset: () => void } | null>(null)

async function onSubmit(e: Event) {
  e.preventDefault()
  if (honeypot.value) return
  if (formRef.value && !formRef.value.checkValidity()) {
    formRef.value.reportValidity()
    return
  }

  submitting.value = true
  messageText.value = ''
  messageClass.value = ''

  try {
    const response = await $fetch<{ status: string; message?: string }>('/api/contact', {
      method: 'POST',
      body: {
        name: name.value,
        email: email.value,
        country: country.value,
        message: message.value,
        consent_doxa_general: consent.value,
        language: locale.value,
        cf_turnstile: turnstileToken.value
      }
    })

    if (response?.status === 'success') {
      messageClass.value = 'success'
      messageText.value = t('Thank you for your message. We will get back to you soon!')
      name.value = ''
      email.value = ''
      country.value = ''
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
  <div class="container page-content">
    <h1 class="page-title">{{ t('Contact Us') }}</h1>

    <form
      id="contact-form"
      ref="formRef"
      class="stack stack--md max-width-lg center"
      @submit="onSubmit"
    >
      <input type="hidden" name="action" value="contact_us">
      <input
        v-model="honeypot"
        type="email"
        name="email"
        style="display:none;"
        autocomplete="off"
        tabindex="-1"
      >

      <div class="">
        <label for="name">{{ t('Name') }}</label>
        <input
          id="name"
          v-model="name"
          type="text"
          name="name"
          required
          :placeholder="t('Enter your name')"
        >
      </div>

      <div class="">
        <label for="contact_email">{{ t('Email') }}</label>
        <input
          id="contact_email"
          v-model="email"
          type="email"
          name="contact_email"
          required
          :placeholder="t('Enter your email')"
        >
      </div>

      <div class="">
        <label for="country">{{ t('Your Country (optional)') }}</label>
        <select id="country" v-model="country" name="country">
          <option value="">{{ t('Select Country') }}</option>
          <option v-for="c in COUNTRIES" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
      </div>

      <div class="">
        <label for="message">{{ t('Message') }}</label>
        <textarea
          id="message"
          v-model="message"
          name="message"
          rows="5"
          required
          :placeholder="t('Enter your message')"
        />
      </div>

      <div class="form-control color-primary-darker">
        <input
          id="consent-doxa-general"
          v-model="consent"
          type="checkbox"
          name="consent_doxa_general"
        >
        <label for="consent-doxa-general">{{ t('I would like to receive email updates from the DOXA partnership.') }}</label>
      </div>

      <NuxtTurnstile
        ref="turnstileRef"
        v-model="turnstileToken"
        :options="{ theme: 'light' }"
      />

      <div
        id="contact-message"
        ref="messageEl"
        class="contact-message"
        :class="messageClass"
        :style="{ display: messageText ? 'block' : 'none' }"
      >{{ messageText }}</div>

      <button
        id="contact-submit"
        type="submit"
        class="button"
        :disabled="submitDisabled"
      >
        {{ submitting ? t('Submitting...') : t('Submit') }}
      </button>
    </form>
  </div>
</template>
