const API_URL = `${CONFIG.BASE_URL}/auth_user/register.php`;

const form = document.getElementById("registerForm");
const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const termsInput = document.getElementById("terms");
const togglePasswordButton = document.getElementById("togglePassword");
const strengthMeter = document.getElementById("strengthMeter");
const submitButton = document.getElementById("submitButton");
const formMessage = document.getElementById("formMessage");

const fields = {
  username: {
    input: usernameInput,
    wrapper: document.getElementById("usernameField"),
    error: document.getElementById("usernameError"),
  },
  email: {
    input: emailInput,
    wrapper: document.getElementById("emailField"),
    error: document.getElementById("emailError"),
  },
  password: {
    input: passwordInput,
    wrapper: document.getElementById("passwordField"),
    error: document.getElementById("passwordError"),
  },
  terms: {
    input: termsInput,
    wrapper: null,
    error: document.getElementById("termsError"),
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

function validateUsername() {
  const value = fields.username.input.value.trim();

  if (!value) {
    setFieldError(fields.username, "Username is required.");
    return false;
  }

  if (value.length < 3) {
    setFieldError(fields.username, "Username must be at least 3 characters.");
    return false;
  }

  setFieldSuccess(fields.username);
  return true;
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

function getPasswordStrength(value) {
  let score = 0;

  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  if (value.length >= 12) score += 1;

  return score;
}

function renderPasswordStrength(value) {
  strengthMeter.classList.remove("weak", "fair", "good", "strong");

  if (!value) {
    return;
  }

  const score = getPasswordStrength(value);

  if (score <= 1) {
    strengthMeter.classList.add("weak");
  } else if (score === 2) {
    strengthMeter.classList.add("fair");
  } else if (score >= 3 && score < 5) {
    strengthMeter.classList.add("good");
  } else {
    strengthMeter.classList.add("strong");
  }
}

function validatePassword() {
  const value = fields.password.input.value;

  if (!value) {
    setFieldError(fields.password, "Password is required.");
    return false;
  }

  if (value.length < 8) {
    setFieldError(fields.password, "Password must be at least 8 characters.");
    return false;
  }

  setFieldSuccess(fields.password);
  return true;
}

function validateTerms() {
  if (!fields.terms.input.checked) {
    setFieldError(
      fields.terms,
      "You must agree to the Terms & Privacy Policy.",
    );
    return false;
  }

  clearFieldState(fields.terms);
  return true;
}

function showFormMessage(message, type) {
  formMessage.textContent = message;
  formMessage.classList.remove("is-error", "is-success");

  if (type) {
    formMessage.classList.add(type === "success" ? "is-success" : "is-error");
  }
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.classList.toggle("is-loading", isLoading);
}

function togglePasswordVisibility() {
  const isHidden = passwordInput.type === "password";
  const icon = document.getElementById("togglePasswordIcon");

  passwordInput.type = isHidden ? "text" : "password";

  togglePasswordButton.setAttribute(
    "aria-label",
    isHidden ? "Hide password" : "Show password",
  );

  if (!icon) return;

  icon.innerHTML = isHidden
    ? `
      <path d="M3 3L21 21"/>
      <path d="M10.6 10.6A2 2 0 0013.4 13.4"/>
      <path d="M9.9 5.1A10.7 10.7 0 0112 5c6.5 0 10 7 10 7a17.8 17.8 0 01-3.2 4.2"/>
      <path d="M6.5 6.5C3.8 8.5 2 12 2 12s3.5 7 10 7a9.8 9.8 0 005.5-1.7"/>
    `
    : `
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
      <circle cx="12" cy="12" r="3"/>
    `;
}

async function submitRegistration(payload) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return await response.json();
}

async function handleSubmit(event) {
  event.preventDefault();
  showFormMessage("", null);

  const isUsernameValid = validateUsername();
  const isEmailValid = validateEmail();
  const isPasswordValid = validatePassword();
  const isTermsValid = validateTerms();

  if (!isUsernameValid || !isEmailValid || !isPasswordValid || !isTermsValid) {
    return;
  }

  const payload = {
    username: fields.username.input.value.trim(),
    email: fields.email.input.value.trim(),
    password: fields.password.input.value,
  };

  setLoading(true);

  try {
    const result = await submitRegistration(payload);

    if (result.success) {
      showFormMessage(
        result.message ||
          "Account created successfully. Redirecting to sign in...",
        "success",
      );

      form.reset();
      strengthMeter.classList.remove("weak", "fair", "good", "strong");
      Object.values(fields).forEach(clearFieldState);

      setTimeout(() => {
        window.location.href = "login.html";
      }, 900);
    } else {
      showFormMessage(
        result.message || "Registration failed. Please try again.",
        "error",
      );
    }
  } catch (error) {
    showFormMessage(
      "Unable to connect to the server. Please try again later.",
      "error",
    );
  } finally {
    setLoading(false);
  }
}

togglePasswordButton.addEventListener("click", togglePasswordVisibility);
passwordInput.addEventListener("input", () =>
  renderPasswordStrength(passwordInput.value),
);
usernameInput.addEventListener("blur", validateUsername);
emailInput.addEventListener("blur", validateEmail);
passwordInput.addEventListener("blur", validatePassword);
termsInput.addEventListener("change", validateTerms);
form.addEventListener("submit", handleSubmit);
