<script setup lang="ts">
// Port of marketing-theme/template-adoption-form.php (WP rewrite
// /adopt/{slug} → template-adoption-form.php). Fetches the people
// group by slug from `{prayBaseUrl}/api/people-groups/detail/{slug}`,
// renders the adoption form, and submits to `/api/adopt` which proxies
// to pray.doxa.life.

import { COUNTRIES } from '~/utils/countries'
import type { Uupg } from '~/types/uupg'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const config = useRuntimeConfig()

const slug = computed(() => String(route.params.slug || ''))

useTextHighlight()

// Fetch UUPG details. Mirrors get_uupg_by_slug() in functions.php.
interface UupgDetail extends Uupg {
  error?: string
}

const { data: uupg, error: uupgError } = await useAsyncData<UupgDetail | null>(
  `uupg-${slug.value}-${locale.value}`,
  async () => {
    if (!slug.value) return null
    const url = `${config.public.prayBaseUrl}/api/people-groups/detail/${encodeURIComponent(slug.value)}?lang=${locale.value}`
    try {
      return await $fetch<UupgDetail>(url)
    } catch {
      return { error: 'not_found' } as UupgDetail
    }
  }
)

const notFound = computed(() => !uupg.value || 'error' in (uupg.value as UupgDetail))

// Adoption form state
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const honeypot = ref('')
const phone = ref('')
const role = ref('')
const churchName = ref('')
const country = ref('')
const confirmAdoption = ref(false)
const permissionToContact = ref(false)
const confirmPublicDisplay = ref(false)
const turnstileToken = ref('')
const turnstileRef = ref<{ reset: () => void } | null>(null)

const submitting = ref(false)
const submitted = ref(false)
const verificationPending = ref(false)
const message = ref('')
const messageClass = ref<'success' | 'error' | ''>('')
const formRef = ref<HTMLFormElement | null>(null)

const submitDisabled = computed(() => submitting.value || !turnstileToken.value)

// Pre-fill phone country from the same geo service the PHP template hits.
const initialCountry = ref('')
onMounted(async () => {
  try {
    const geo = await $fetch<{ country?: { iso_code?: string } }>('https://geo.prayer.global/json')
    if (geo?.country?.iso_code) initialCountry.value = geo.country.iso_code.toLowerCase()
  } catch {
    // ignore geo failure
  }
})

async function onSubmit(e: Event) {
  e.preventDefault()
  if (honeypot.value) return
  if (formRef.value && !formRef.value.checkValidity()) {
    formRef.value.reportValidity()
    return
  }
  if (!confirmAdoption.value) {
    messageClass.value = 'error'
    message.value = t('Please confirm your adoption commitment.')
    return
  }

  submitting.value = true
  message.value = ''
  messageClass.value = ''

  try {
    const response = await $fetch<{ status: string; message?: string }>('/api/adopt', {
      method: 'POST',
      body: {
        first_name: firstName.value,
        last_name: lastName.value,
        email: email.value,
        phone: phone.value,
        church_name: churchName.value,
        country: country.value,
        role: role.value,
        confirm_adoption: confirmAdoption.value,
        permission_to_contact: permissionToContact.value,
        confirm_public_display: confirmPublicDisplay.value,
        people_group: slug.value,
        language: locale.value,
        cf_turnstile: turnstileToken.value
      }
    })

    if (response?.status === 'needs_verification') {
      verificationPending.value = true
      submitted.value = true
    } else if (response?.status === 'success') {
      messageClass.value = 'success'
      submitted.value = true
      // Reset fields
      firstName.value = ''
      lastName.value = ''
      email.value = ''
      phone.value = ''
      role.value = ''
      churchName.value = ''
      country.value = ''
      confirmAdoption.value = false
      permissionToContact.value = false
      confirmPublicDisplay.value = false
      formRef.value?.reset()
    } else {
      messageClass.value = 'error'
      message.value = response?.message ?? t('There was an error submitting your adoption. Please try again.')
    }
  } catch (err: any) {
    messageClass.value = 'error'
    message.value = err?.data?.message ?? t('There was an error submitting your adoption. Please try again.')
  } finally {
    submitting.value = false
    turnstileToken.value = ''
    turnstileRef.value?.reset()
  }
}
</script>

<template>
  <div v-if="notFound || uupgError" class="container page-content uupg-detail-page">
    <div class="stack stack--lg">
      <h1>{{ t('People Group Not Found') }}</h1>
      <p>{{ t('The people group you are looking for could not be found. Please try again.') }}</p>
      <NuxtLink :to="localePath('/adopt')" class="button font-size-lg">
        <span class="sr-only">{{ t('Back') }}</span>
        <svg class="icon | rotate-270" viewBox="0 0 489.67 289.877">
          <path d="M439.017,211.678L263.258,35.919c-3.9-3.9-8.635-6.454-13.63-7.665-9.539-2.376-20.051.161-27.509,7.619L46.361,211.632c-11.311,11.311-11.311,29.65,0,40.961h0c11.311,11.311,29.65,11.311,40.961,0L242.667,97.248l155.39,155.39c11.311,11.311,29.65,11.311,40.961,0h0c11.311-11.311,11.311-29.65,0-40.961Z" />
        </svg>
        {{ t('Back') }}
      </NuxtLink>
    </div>
  </div>

  <div v-else-if="uupg" class="container page-content uupg-detail-page">
    <div class="stack stack--lg">
      <h1 class="highlight" data-highlight-index="1">{{ t('Adoption Form') }}</h1>
      <p class="subtext">{{ t("Thank you for taking a step toward adopting an unengaged people group. Please complete the form below so we can confirm your church's adoption, connect with your Champion, and begin sending prayer updates and resources.") }}</p>

      <div class="switcher | adoption-card shadow">
        <div class="grow-none">
          <img
            class="uupg__image"
            data-size="small"
            :src="uupg.image_url"
            :alt="uupg.name || 'People Group Photo'"
          >
        </div>
        <div class="repel align-center">
          <div class="stack stack--md lh-0">
            <p class="font-size-xl font-weight-medium">{{ uupg.name }}</p>
            <p class="font-size-lg font-weight-medium">
              {{ uupg.country_code?.label }} ({{ uupg.rop1?.label }})
            </p>
          </div>
        </div>
      </div>

      <!-- Post-submit verification screen (from template-adoption-form.php lines 236-254) -->
      <div v-if="submitted && verificationPending" class="text-card shadow text-center">
        <div class="stack">
          <div class="color-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h2 class="highlight" data-highlight-index="1">{{ t('Success! Form submitted.') }}</h2>
          <p>
            {{ t('To confirm your adoption, please verify your email address. We sent a verification email to') }}
            <strong>{{ email }}</strong>.
          </p>
          <p class="font-size-xs">
            {{ t("Don't see the email? Check your spam folder.") }}
          </p>
        </div>
      </div>

      <!-- Adoption form (from template-adoption-form.php lines 61-148) -->
      <form
        v-else
        id="adoption-form"
        ref="formRef"
        class="text-card shadow"
        @submit="onSubmit"
      >
        <input v-model="honeypot" type="email" name="email" style="display:none;" autocomplete="off" tabindex="-1">
        <input type="hidden" name="people_group" :value="slug">

        <div class="stack stack--lg | max-width-lg mx-auto">
          <section class="stack">
            <h3 class="highlight" data-highlight-index="4">{{ t('What is your commitment? Pray. Give. Send.') }}</h3>
            <p>{{ t('When you adopt a people group, you step into a leadership role on their behalf—standing in the gap until the gospel takes root. This involves a commitment to:') }}</p>
            <ul class="stack" data-list-color="primary">
              <li>
                <strong>{{ t('Pray') }} – </strong>
                {{ t('Mobilize toward the goal of at least 144 prayer partners to cover the people group in continuous, daily prayer (10 minutes each, 24 hours a day).') }}
              </li>
              <li>
                <strong>{{ t('Give') }} – </strong>
                {{ t('Partner financially on a monthly basis with the Doxa Foundation to help sustain prayer mobilization, campaign operations, and the sending of gospel workers.') }}
                <br><br>
                {{ t('We recommend that churches give a monthly pledge based on their congregational size.  i.e. $100 a month for a congregation around 100.  $500 a month for a congregation around 500. $1000 a month for a congregation around 1000, etc.') }}
              </li>
              <li>
                <strong>{{ t('Send') }} – </strong>
                {{ t('Actively help surface and support potential goers, encouraging those God may be calling to cross cultures and serve this people group directly.') }}
              </li>
            </ul>
          </section>

          <div class="stack">
            <h3 class="h5">{{ t('Champion Details') }}</h3>
            <i class="color-primary font-size-sm">{{ t('The Champion is the person who will organize the 144 intercessors and receive updates.') }}</i>
            <div class="">
              <label for="first-name">{{ t('First Name') }}</label>
              <input id="first-name" v-model="firstName" type="text" name="first_name" required :placeholder="t('First Name')">
            </div>
            <div class="">
              <label for="last-name">{{ t('Last Name') }}</label>
              <input id="last-name" v-model="lastName" type="text" name="last_name" required :placeholder="t('Last Name')">
            </div>
            <div class="">
              <label for="contact-email">{{ t('Email') }}</label>
              <input id="contact-email" v-model="email" type="email" name="contact_email" required :placeholder="t('Enter your email')">
            </div>
            <div class="">
              <label for="phone">{{ t('Phone') }}</label>
              <PhoneInput
                :value="phone"
                :initialCountry="initialCountry"
                :t="{
                  phone_error: t('Please enter a valid phone number'),
                  phone_error_too_short: t('Phone number is too short'),
                  phone_error_too_long: t('Phone number is too long')
                }"
                @phone-input="(d) => phone = d.number"
              />
            </div>
            <div class="">
              <label for="role">{{ t('Role') }}</label>
              <input id="role" v-model="role" type="text" name="role" required :placeholder="t('Example: Pastor, Missions Pastor, Elder, Volunteer Leader etc.')">
            </div>
          </div>

          <div class="stack">
            <h3 class="h5">{{ t('Partnering Church') }}</h3>
            <div class="">
              <label for="church-name">{{ t('Church/Group Name') }}</label>
              <input id="church-name" v-model="churchName" type="text" name="church_name" required :placeholder="t('Enter Church/Group Name')">
            </div>
            <div class="form-control color-primary-darker">
              <input id="confirm-public-display" v-model="confirmPublicDisplay" type="checkbox" name="confirm_public_display">
              <label for="confirm-public-display">{{ t('I am happy for this church name to appear publicly on this site.') }}</label>
            </div>
            <div>
              <label for="country">{{ t('Location of Church/Group') }}</label>
              <select id="country" v-model="country" name="country" required>
                <option value="" disabled selected hidden>{{ t('Select Country') }}</option>
                <option v-for="c in COUNTRIES" :key="c.value" :value="c.label">{{ c.label }}</option>
              </select>
            </div>
          </div>

          <div class="form-control color-primary-darker">
            <input id="confirm-adoption" v-model="confirmAdoption" type="checkbox" name="confirm_adoption">
            <label for="confirm-adoption">{{ t('I/my church/group commits to adopting this People Group for prayer, partnership and support.') }}</label>
          </div>
          <div class="form-control color-primary-darker">
            <input id="permission-to-contact" v-model="permissionToContact" type="checkbox" name="permission_to_contact">
            <label for="permission-to-contact">{{ t('I give permission for DOXA to connect me with others adopting this people group.') }}</label>
          </div>

          <NuxtTurnstile
            ref="turnstileRef"
            v-model="turnstileToken"
            :options="{ theme: 'light' }"
          />

          <div
            v-if="message"
            id="adoption-message"
            class="contact-message"
            :class="messageClass"
            style="display: block;"
            v-html="message"
          />

          <button
            id="adoption-submit"
            type="submit"
            class="button compact"
            :disabled="submitDisabled"
          >
            {{ submitting ? t('Submitting...') : t('Submit') }}
          </button>
        </div>
      </form>

      <!-- Post-submit success screen (matches the inner innerHTML write from template-adoption-form.php) -->
      <div v-if="submitted && !verificationPending && messageClass === 'success'" class="contact-message success" style="display: block;">
        <p>{{ t('Thank you for your adoption commitment! We will be in touch soon.') }}</p>
        <NuxtLink
          v-if="locale === 'en'"
          :to="`${localePath('/research') || '/research'}/${slug}/resources`"
          class="button compact | resources-button"
        >{{ t('View Adoption Resources') }}</NuxtLink>
      </div>
    </div>
  </div>
</template>
