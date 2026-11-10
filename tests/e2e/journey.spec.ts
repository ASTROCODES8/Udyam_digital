import { test, expect } from "@playwright/test";

test.describe("Udyam Digital End-to-End Customer Journey", () => {
  test("1. Full Happy Path: Advisor -> Quote -> Checkout -> KYC (K03 Clean) -> Tracker", async ({
    page,
  }) => {
    // ── STEP 1: Advisor Page (Home) ──
    await page.goto("/");
    await expect(page).toHaveTitle(/Airtel|Accel|Udyam/i);

    // Verify Top Journey Progress Bar
    await expect(page.locator("text=Digital Journey: Step 1 of 4")).toBeVisible();
    await expect(page.locator("text=~10 mins left").first()).toBeVisible();

    // Verify 3 Demo Personas exist on home page
    const kiranaPersona = page.locator("button:has-text('Kirana owner (Hindi)')");
    const clinicPersona = page.locator("button:has-text('Clinic (English)')");
    const restaurantPersona = page.locator("button:has-text('Restaurant chain (Tamil)')");

    await expect(kiranaPersona).toBeVisible();
    await expect(clinicPersona).toBeVisible();
    await expect(restaurantPersona).toBeVisible();

    // Click Clinic Persona
    await clinicPersona.click();

    // Verify that the Advisor generates a recommendation and "Continue to Quote" button appears
    const quoteButton = page.locator("a:has-text('Continue to Quote')");
    await expect(quoteButton).toBeVisible({ timeout: 25000 });

    // ── STEP 2: Plan & Quote Page ──
    await quoteButton.click();
    await expect(page).toHaveURL(/.*\/quote.*/);

    // Verify Progress Bar shows Step 2 (Plan & Quote)
    await expect(page.locator("text=Step 2 of 4")).toBeVisible();
    await expect(page.locator("text=Plan & Quote")).toBeVisible();

    // Verify monthly pricing card is displayed
    await expect(page.locator("text=/mo + GST").first()).toBeVisible();

    // Trigger Checkout Modal
    const checkoutBtn = page.locator("button:has-text('Proceed to Checkout')");
    await expect(checkoutBtn).toBeVisible();
    await checkoutBtn.click();

    // Step 2.1: Details Form
    const nameInput = page.locator("input[placeholder*='e.g. Rajesh Kumar']");
    await nameInput.fill("Joseph Joshi");
    const phoneInput = page.locator("input[placeholder*='98765 00000']");
    await phoneInput.fill("9845012345");

    const continueOtpBtn = page.locator("button:has-text('Continue to Mobile Verification')");
    await continueOtpBtn.click();

    // Step 2.2: Mock OTP
    const otpInput = page.locator("input[placeholder='123456']");
    await otpInput.fill("123456");
    const verifyOtpBtn = page.locator("button:has-text('Verify & Continue')");
    await verifyOtpBtn.click();

    // Step 2.3: Mandate Terms
    const mandateBtn = page.locator("button:has-text('Authorize Mandate & Proceed to KYC')");
    await expect(mandateBtn).toBeVisible();
    await mandateBtn.click();

    // ── STEP 3: Smart KYC Stepper ──
    await expect(page).toHaveURL(/.*\/kyc.*/, { timeout: 15000 });
    await expect(page.locator("text=Step 3 of 4")).toBeVisible();

    // Step 3.1: Consent
    const consentCheckbox = page.locator("input[type='checkbox']").first();
    await consentCheckbox.check();
    const consentNextBtn = page.locator("button:has-text('I Accept & Continue to GSTIN')");
    await consentNextBtn.click();

    // Step 3.2: Advance to Step 3 (Udyam)
    const toUdyamBtn = page.locator("button:has-text('Save & Continue to Udyam')");
    await toUdyamBtn.click();

    // Step 3.3: Advance to Step 4 (Documents)
    const toDocsBtn = page.locator("button:has-text('Save & Continue to Documents')");
    await toDocsBtn.click();

    // Step 3.4: Select Clean Baseline Applicant K03 (Star Electronics)
    const k03Button = page.locator("button:has-text('K03')").first();
    await k03Button.click();

    // Run Regulatory Cross-Checks (Advance to Step 5)
    const runChecksBtn = page.locator("button:has-text('Run Verification Checklist')");
    await runChecksBtn.click();

    // Step 3.5: Verify KYC Approved for Clean Applicant K03
    const approvalNotice = page.locator("text=KYC Verification Approved");
    await expect(approvalNotice).toBeVisible({ timeout: 15000 });

    // Step 3.6: Proceed to Step 6 (e-Sign)
    const toEsignBtn = page.locator("button:has-text('Continue to Aadhaar e-Sign')");
    await toEsignBtn.click();

    // Execute Aadhaar e-Sign
    const signBtn = page.locator("button:has-text('Authorize e-Sign & Provision Service')");
    await signBtn.click();

    // ── STEP 4: Order Fulfillment Tracker ──
    await expect(page).toHaveURL(/.*\/track\/.*/, { timeout: 20000 });

    // Verify Progress Bar is at Step 4 (Fulfillment)
    await expect(page.locator("text=Step 4 of 4")).toBeVisible();
    await expect(page.locator("text=Fulfillment")).toBeVisible();

    // Verify Tracker details: 5 Lifecycle Stages & Honest SLA
    await expect(page.locator("text=Order Lifecycle Timeline")).toBeVisible();
    await expect(page.locator("text=Honest SLA Guarantee")).toBeVisible();
    await expect(page.locator("text=Something wrong?")).toBeVisible();
  });

  test("2. KYC Failure Path: Planted Defect K01 (Cancelled GSTIN) is Flagged", async ({
    page,
  }) => {
    // Navigate directly to KYC with an order
    await page.goto("/kyc?orderId=ORD-0001");

    // Agree to consent
    const consentCheckbox = page.locator("input[type='checkbox']").first();
    await consentCheckbox.check();
    const consentNextBtn = page.locator("button:has-text('I Accept & Continue to GSTIN')");
    await consentNextBtn.click();

    // Go to Step 3 -> Step 4
    await page.locator("button:has-text('Save & Continue to Udyam')").click();
    await page.locator("button:has-text('Save & Continue to Documents')").click();

    // Select K01 (Balaji Dental Care LLP - Cancelled GSTIN)
    const k01Button = page.locator("button:has-text('K01')").first();
    await k01Button.click();

    // Run Regulatory Cross-Checks
    const runChecksBtn = page.locator("button:has-text('Run Verification Checklist')");
    await runChecksBtn.click();

    // Verify that the KYC check fails and is properly flagged
    const flagNotice = page.locator("text=KYC Verification Flagged");
    await expect(flagNotice).toBeVisible({ timeout: 15000 });

    // Check specific failure message for Cancelled GSTIN
    const cancelledMsg = page.locator("text=Cancelled in official registry");
    await expect(cancelledMsg).toBeVisible();
  });
});
