const API_URL_FORGOT = `${CONFIG.BASE_URL}/auth_user/forgot_password.php`;
const API_URL_VERIFY = `${CONFIG.BASE_URL}/auth_user/verify_reset_code.php`;
const API_URL_RESET = `${CONFIG.BASE_URL}/auth_user/reset_password.php`;

const stepTitle = document.getElementById("stepTitle");
const stepSubtitle = document.getElementById("stepSubtitle");

const emailStep = document.getElementById("emailStep");
const codeStep = document.getElementById("codeStep");
const passwordStep = document.getElementById("passwordStep");

const stepDotEmail = document.getElementById("stepDotEmail");
const stepDotCode = document.getElementById("stepDotCode");
const stepDotPassword = document.getElementById("stepDotPassword");
const stepLineCode = document.getElementById("stepLineCode");
const stepLinePassword = document.getElementById("stepLinePassword");

const emailInput = document.getElementById("email");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const togglePasswordButton = document.getElementById("togglePassword");

const sendCodeButton = document.getElementById("sendCodeButton");
const verifyCodeButton = document.getElementById("verifyCodeButton");
const resetPasswordButton = document.getElementById("resetPasswordButton");
const backToEmailButton = document.getElementById("backToEmailButton");
const backToCodeButton = document.getElementById("backToCodeButton");

const otpGroup = document.getElementById("otpGroup");
const otpInputs = document.querySelectorAll(".otp-input");

const formMessage = document.getElementById("formMessage");

let currentEmail = "";
let verifiedCode = "";

const fields = {
  email: {
    input: emailInput,
    wrapper: document.getElementById("emailField"),
    error: document.getElementById("emailError"),
  },
  code: {
    input: null,
    wrapper: otpGroup,
    error: document.getElementById("codeError"),
  },
  password: {
    input: newPasswordInput,
    wrapper: document.getElementById("passwordField"),
    error: document.getElementById("passwordError"),
  },
  confirmPassword: {
    input: confirmPasswordInput,
    wrapper: document.getElementById("confirmPasswordField"),
    error: document.getElementById("confirmPasswordError"),
  },
};

function setFieldError(field, message) {
  field.error.textContent = message;

  if (field.wrapper) {
    field.wrapper.classList.toggle("is-error", Boolean(message));
    field.wrapper.classList.remove("is-success");
  }
}

function setFieldSuccess(field) {
  field.error.textContent = "";

  if (field.wrapper) {
    field.wrapper.classList.remove("is-error");
    field.wrapper.classList.add("is-success");
  }
}

function clearFieldState(field) {
  field.error.textContent = "";

  if (field.wrapper) {
    field.wrapper.classList.remove("is-error", "is-success");
  }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getCodeValue() {
  return Array.from(otpInputs)
    .map((input) => input.value)
    .join("");
}

function clearOtpInputs() {
  otpInputs.forEach((input) => {
    input.value = "";
  });
}

function validateEmail() {
  const value = fields.email.input.value.trim();

  if (!value) {
    setFieldError(fields.email, "Email is required.");
    return false;
  }

  if (!isValidEmail(value)) {
    setFieldError(fields.email, "Enter a valid email address.");
    return false;
  }

  setFieldSuccess(fields.email);
  return true;
}

function validateCode() {
  const value = getCodeValue();

  if (!value) {
    setFieldError(fields.code, "Verification code is required.");
    return false;
  }

  if (!/^\d{6}$/.test(value)) {
    setFieldError(fields.code, "Verification code must be 6 digits.");
    return false;
  }

  setFieldSuccess(fields.code);
  return true;
}

function validatePassword() {
  const value = fields.password.input.value;

  if (!value) {
    setFieldError(fields.password, "New password is required.");
    return false;
  }

  if (value.length < 8) {
    setFieldError(fields.password, "Password must be at least 8 characters.");
    return false;
  }

  setFieldSuccess(fields.password);
  return true;
}

function validateConfirmPassword() {
  const password = fields.password.input.value;
  const confirmPassword = fields.confirmPassword.input.value;

  if (!confirmPassword) {
    setFieldError(fields.confirmPassword, "Please confirm your new password.");
    return false;
  }

  if (password !== confirmPassword) {
    setFieldError(fields.confirmPassword, "Passwords do not match.");
    return false;
  }

  setFieldSuccess(fields.confirmPassword);
  return true;
}

function showFormMessage(message, type) {
  formMessage.textContent = message;
  formMessage.classList.remove("is-error", "is-success");

  if (type) {
    formMessage.classList.add(type === "success" ? "is-success" : "is-error");
  }
}

function setLoading(button, isLoading) {
  button.disabled = isLoading;
  button.classList.toggle("is-loading", isLoading);
}

function setStepIndicator(step) {
  stepDotEmail.classList.toggle("is-active", step === 1);
  stepDotCode.classList.toggle("is-active", step === 2);
  stepDotPassword.classList.toggle("is-active", step === 3);

  stepDotEmail.classList.toggle("is-complete", step > 1);
  stepDotCode.classList.toggle("is-complete", step > 2);

  stepLineCode.classList.toggle("is-complete", step > 1);
  stepLinePassword.classList.toggle("is-complete", step > 2);
}

function showStep(step) {
  emailStep.classList.toggle("is-active", step === 1);
  codeStep.classList.toggle("is-active", step === 2);
  passwordStep.classList.toggle("is-active", step === 3);

  setStepIndicator(step);

  if (step === 1) {
    stepTitle.textContent = "Reset Password";
    stepSubtitle.textContent =
      "Enter your registered email address to receive a verification code.";
  }

  if (step === 2) {
    stepTitle.textContent = "Verify Code";
    stepSubtitle.textContent =
      "Enter the 6-digit code sent to your email address.";
    otpInputs[0].focus();
  }

  if (step === 3) {
    stepTitle.textContent = "Create New Password";
    stepSubtitle.textContent =
      "Set a new password for your Veritas AI account.";
    newPasswordInput.focus();
  }

  showFormMessage("", null);
}

function togglePasswordVisibility() {
  const isPassword = newPasswordInput.type === "password";

  newPasswordInput.type = isPassword ? "text" : "password";
  confirmPasswordInput.type = isPassword ? "text" : "password";

  togglePasswordButton.setAttribute(
    "aria-label",
    isPassword ? "Hide password" : "Show password",
  );

  togglePasswordButton.textContent = isPassword ? "🙈" : "👁";
}

async function submitForgotPassword(payload) {
  const response = await fetch(API_URL_FORGOT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return await response.json();
}

async function submitVerifyCode(payload) {
  const response = await fetch(API_URL_VERIFY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return await response.json();
}

async function submitResetPassword(payload) {
  const response = await fetch(API_URL_RESET, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return await response.json();
}

async function handleSendCode() {
  showFormMessage("", null);

  if (!validateEmail()) {
    return;
  }

  currentEmail = emailInput.value.trim();

  setLoading(sendCodeButton, true);

  try {
    const result = await submitForgotPassword({
      email: currentEmail,
    });

    if (result.success) {
      showStep(2);
      showFormMessage(
        result.message || "Verification code has been sent.",
        "success",
      );
    } else {
      showFormMessage(
        result.message || "Failed to send verification code.",
        "error",
      );
    }
  } catch (error) {
    showFormMessage(
      "Unable to connect to the server. Please try again later.",
      "error",
    );
  } finally {
    setLoading(sendCodeButton, false);
  }
}

async function handleVerifyCode() {
  showFormMessage("", null);

  if (!validateCode()) {
    return;
  }

  verifiedCode = getCodeValue();

  setLoading(verifyCodeButton, true);

  try {
    const result = await submitVerifyCode({
      email: currentEmail,
      reset_code: verifiedCode,
    });

    if (result.success) {
      showStep(3);
      showFormMessage(
        result.message || "Verification code confirmed.",
        "success",
      );
    } else {
      showFormMessage(
        result.message || "Invalid or expired verification code.",
        "error",
      );
    }
  } catch (error) {
    showFormMessage(
      "Unable to connect to the server. Please try again later.",
      "error",
    );
  } finally {
    setLoading(verifyCodeButton, false);
  }
}

async function handleResetPassword() {
  showFormMessage("", null);

  const isPasswordValid = validatePassword();
  const isConfirmPasswordValid = validateConfirmPassword();

  if (!isPasswordValid || !isConfirmPasswordValid) {
    return;
  }

  setLoading(resetPasswordButton, true);

  try {
    const result = await submitResetPassword({
      email: currentEmail,
      reset_code: verifiedCode,
      new_password: newPasswordInput.value,
    });

    if (result.success) {
      showFormMessage(
        result.message || "Password has been reset successfully.",
        "success",
      );

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);
    } else {
      showFormMessage(result.message || "Failed to reset password.", "error");
    }
  } catch (error) {
    showFormMessage(
      "Unable to connect to the server. Please try again later.",
      "error",
    );
  } finally {
    setLoading(resetPasswordButton, false);
  }
}

function handleOtpInput(event, index) {
  const input = event.target;
  input.value = input.value.replace(/\D/g, "");

  if (input.value && index < otpInputs.length - 1) {
    otpInputs[index + 1].focus();
  }

  clearFieldState(fields.code);
}

function handleOtpKeydown(event, index) {
  if (event.key === "Backspace" && !otpInputs[index].value && index > 0) {
    otpInputs[index - 1].focus();
  }
}

function handleOtpPaste(event) {
  event.preventDefault();

  const pastedValue = event.clipboardData
    .getData("text")
    .replace(/\D/g, "")
    .slice(0, 6);

  pastedValue.split("").forEach((digit, index) => {
    otpInputs[index].value = digit;
  });

  if (pastedValue.length === 6) {
    otpInputs[5].focus();
  }

  clearFieldState(fields.code);
}

sendCodeButton.addEventListener("click", handleSendCode);
verifyCodeButton.addEventListener("click", handleVerifyCode);
resetPasswordButton.addEventListener("click", handleResetPassword);
backToEmailButton.addEventListener("click", () => showStep(1));
backToCodeButton.addEventListener("click", () => showStep(2));
togglePasswordButton.addEventListener("click", togglePasswordVisibility);

emailInput.addEventListener("blur", validateEmail);
newPasswordInput.addEventListener("blur", validatePassword);
confirmPasswordInput.addEventListener("blur", validateConfirmPassword);

otpInputs.forEach((input, index) => {
  input.addEventListener("input", (event) => handleOtpInput(event, index));
  input.addEventListener("keydown", (event) => handleOtpKeydown(event, index));
  input.addEventListener("paste", handleOtpPaste);
});

showStep(1);
