# Sangham analytics implementation

Updated: 21 July 2026

This document describes the events emitted by the website. The site pushes structured objects to `window.dataLayer`. Google Tag Manager and GA4 must be configured separately to receive and report them.

No enquiry message, email address, name, booking UID, or other counselling content is sent to the data layer.

## Shared event parameters

Most events include:

| Parameter | Meaning |
| --- | --- |
| `page_path` | Current page path, without query parameters |
| `service` | `adult-counselling`, `meditators`, `young-men`, `teenage-boys`, `workshops`, or `general` |
| `placement` | Explicit page placement such as `hero`, `homepage-router`, `article-closing`, or `footer` |
| `cta_id` | Stable CTA identifier from `data-cta` |
| `link_text` | Visible link text, trimmed and limited to 120 characters |
| `destination` | Link destination where relevant |
| `utm_source` | First campaign source captured in the session |
| `utm_medium` | First campaign medium captured in the session |
| `utm_campaign` | First campaign name captured in the session |
| `utm_content` | First message or placement variant captured in the session |
| `referral_code` | Value of the simple `ref` parameter |
| `initial_landing_page` | First page path in the current browser session |
| `initial_referrer` | Referring origin and path, with query parameters removed |

Campaign values are stored in first-party `sessionStorage`. They remain available across pages in the same tab and expire when the browser session ends. This is sufficient for a warm-referral visit without creating a user profile or adding a database.

## Conversion and journey events

| Event | When it fires | Important additional parameters |
| --- | --- | --- |
| `referral_landing_view` | A page is opened with at least one supported UTM or `ref` parameter, once per tagged landing URL per session | `landing_page` |
| `fit_call_cta_click` | Any explicit free fit-call CTA is clicked | Standard CTA parameters |
| `written_enquiry_open` | The written-enquiry route on the contact page is selected | Standard CTA parameters |
| `written_enquiry_submit` | A valid written-enquiry submission attempt begins | `enquiry_type` |
| `written_enquiry_success` | The Formspree request succeeded and the visitor reached the enquiry confirmation page with a one-time session marker | `enquiry_type`, `confirmation_method` |
| `written_enquiry_failure` | The written-enquiry request failed or Formspree returned a non-success status | `enquiry_type`, `error_type` |
| `cal_booking_initiated` | Cal.com reports that a booker is visible, once per relevant calendar and session | `booking_type`, `cal_event_slug`, `cal_event_type_id` |
| `fit_call_booked` | Cal.com emits `bookingSuccessfulV2` with an accepted or confirmed status and the fit-call confirmation page consumes the one-time marker | `booking_status`, `cal_event_slug`, `cal_event_type_id`, `confirmation_method` |
| `fit_call_booking_submitted` | Cal.com creates the booking but reports a status other than accepted or confirmed | `booking_status`, `cal_event_slug`, `cal_event_type_id`, `confirmation_method` |
| `parent_consultation_cta_click` | A parent-consultation CTA on the teenage mentoring page is clicked | Standard CTA parameters |
| `parental_consultation_booked` | Cal.com emits `bookingSuccessfulV2` for the paid parent consultation | `booking_status`, `booking_type`, `cal_event_slug`, `cal_event_type_id` |
| `calendar_fallback_click` | A direct Cal.com fallback link is clicked | Standard CTA parameters |
| `whatsapp_click` | A WhatsApp link is clicked | Standard CTA parameters |
| `email_click` | An email link is clicked | Standard CTA parameters |
| `newsletter_subscription_success` | An essay subscription receives a successful Formspree response | `form_placement` |
| `newsletter_subscription_failure` | An essay subscription fails | `form_placement`, `error_type` |
| `home_service_router_click` | One of the four service routes on the homepage is selected | `service`, `placement` |
| `article_service_cta_click` | A Writing article sends a reader towards a related service or fit call | `service`, `placement` |

## Supporting events

| Event | Purpose |
| --- | --- |
| `resource_request_success` and `resource_request_failure` | Measures the counselling overview and Beneath the Mask guide requests |
| `workshop_interest_success` and `workshop_interest_failure` | Measures workshop interest form outcomes |
| `faq_expand` | Measures opened FAQ questions |
| `scroll_depth` | Measures 25, 50, 75, and 90 percent depth on selected core pages |

## Durable confirmation logic

The Cal.com listener uses the current `bookingSuccessfulV2` event and reads its fields from `event.detail.data`. The deprecated `bookingSuccessful` event and generic iframe `postMessage` listener have been removed.

The callback stores a one-time marker in `sessionStorage` and then moves to `/thank-you-fit-call/`. The conversion event fires on the confirmation page and the marker is removed immediately. Refreshing the page or visiting it directly does not create another conversion.

Written enquiries follow the same pattern. A successful Formspree response stores a one-time marker and moves to `/thank-you-enquiry/`. Submit-button clicks are not counted as successful enquiries.

## Attribution passed to forms and Cal.com

The written enquiry, essay newsletter, workshop interest, counselling overview, and guide-request forms submit the following hidden values:

* `attribution_utm_source`
* `attribution_utm_medium`
* `attribution_utm_campaign`
* `attribution_utm_content`
* `attribution_ref`
* `attribution_initial_landing_page`
* `attribution_initial_referrer`
* `submission_page_path`

The Cal.com inline configuration receives the four UTM parameters when available. Direct calendar fallback links receive the same four parameters. The simple `ref` value remains in the Sangham session and is attached to the booking-confirmation dataLayer event because Cal.com cannot record it reliably without a matching custom question.

## Consent Mode behaviour

Consent defaults are sent before GTM loads.

* Advertising storage, ad user data, and ad personalisation default to denied everywhere.
* Analytics storage defaults to denied for `Europe/*`, the listed European island timezones, Ceuta, and unknown timezones.
* Analytics storage defaults to granted for other recognised timezones.
* Accept all grants analytics and advertising consent.
* Reject all denies both.
* Custom preferences apply each category independently.
* Saved preferences are reapplied before GTM on returning visits and expire after 12 months.
* Reopening Cookie Preferences restores the saved controls and does not overwrite them until Save preferences is selected.

The timezone check is deliberately conservative. It is a client-side approximation, not legal geolocation.

## Manual GTM and GA4 configuration

Michael or the person managing the Google accounts must complete the following:

1. Create GTM Custom Event triggers for the events in the conversion table.
2. Send those events to GA4 using a GA4 Event tag or the existing equivalent setup.
3. Mark `fit_call_booked`, `written_enquiry_success`, and, if useful, `parental_consultation_booked` as GA4 key events. Newsletter subscriptions can remain a secondary event unless they become a launch objective.
4. Register event-scoped custom dimensions for `service`, `placement`, `cta_id`, `referral_code`, `initial_landing_page`, `enquiry_type`, `booking_type`, and `form_placement` if they are needed in GA4 reports.
5. In GTM Consent Overview, confirm that GA4 tags require `analytics_storage` and any advertising tags require the relevant advertising consent types. Google tags have built-in consent checks, but custom HTML or third-party tags must be configured explicitly.
6. Test Accept all, Reject all, and custom preferences in GTM Preview and GA4 DebugView before using the numbers for decisions.
7. In Cal.com, enable the UTM tracking questions or fields for the `fit` and `parental-consultation` event types if campaign values should also appear inside Cal.com. The site-side booking event retains attribution even if this Cal.com setting is not enabled.
8. Check Formspree notification templates or exports if the attribution hidden fields are not visible in the default email view. The fields are included in the submitted payload.

The repository does not contain a GA4 Measurement ID or GTM workspace configuration. Publishing container changes remains a manual Google account action.
