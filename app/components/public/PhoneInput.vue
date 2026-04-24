<script setup lang="ts">
// Port of marketing-theme/js/components/src/phone-input.js (Lit → Vue).
// Wraps intl-tel-input. Emits `phone-input` (with the current E.164 number)
// and `invalid` (with a validation message from props.t) per the source.

import intlTelInput from 'intl-tel-input'
import 'intl-tel-input/build/css/intlTelInput.css'

interface PhoneTranslations {
  phone_error?: string
  phone_error_too_short?: string
  phone_error_too_long?: string
}

const props = withDefaults(defineProps<{
  value?: string
  required?: boolean
  placeholder?: string
  initialCountry?: string
  t?: PhoneTranslations
}>(), {
  value: '',
  required: false,
  placeholder: '',
  initialCountry: '',
  t: () => ({})
})

const emit = defineEmits<{
  (e: 'phone-input', detail: { number: string }): void
  (e: 'invalid', detail: { number: string; message: string }): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
// Keep outside reactive state — intl-tel-input returns an instance with
// DOM-mutating methods; wrapping in a ref triggers unnecessary proxying.
let iti: ReturnType<typeof intlTelInput> | null = null
const number = ref(props.value)

function handleInput() {
  if (!iti) return
  number.value = iti.getNumber()
  emit('phone-input', { number: number.value })

  if (!iti.isValidNumber()) {
    const error = iti.getValidationError() as unknown as string | number
    let message = ''
    if (error === 'TOO_SHORT') message = props.t.phone_error_too_short ?? ''
    else if (error === 'TOO_LONG') message = props.t.phone_error_too_long ?? ''
    else message = props.t.phone_error ?? ''
    emit('invalid', { number: number.value, message })
  }
}

onMounted(() => {
  if (!inputRef.value) return
  iti = intlTelInput(inputRef.value, {
    initialCountry: (props.initialCountry || undefined) as any,
    loadUtils: () => import('intl-tel-input/utils')
  })
  number.value = props.value
})

watch(() => props.initialCountry, (c) => {
  if (iti && c) iti.setCountry(c as any)
})

onBeforeUnmount(() => {
  iti?.destroy()
  iti = null
})

defineExpose({ getNumber: () => number.value })
</script>

<template>
  <input
    ref="inputRef"
    type="tel"
    id="phone"
    class="input"
    name="phone"
    :value="value"
    :required="required"
    :placeholder="placeholder"
    @input="handleInput"
  >
</template>
