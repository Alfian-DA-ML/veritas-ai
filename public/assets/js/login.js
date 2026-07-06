const API_URL = `${CONFIG.BASE_URL}/auth_user/login.php`;

const form = document.getElementById("loginForm");
const identifierInput = document.getElementById("identifier");
const passwordInput = document.getElementById("password");
const rememberMeInput = document.getElementById("rememberMe");
const togglePasswordButton = document.getElementById("togglePassword");
const submitButton = document.getElementById("submitButton");
const formMessage = document.getElementById("formMessage");

const fields = {
  identifier: {
    input: identifierInput,
    wrapper: document.getElementById("identifierField"),
    error: document.getElementById("identifierError"),
  },
  password: {
    input: passwordInput,
    wrapper: document.getElementById("passwordField"),
    error: document.getElementById("passwordError"),
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

function validateIdentifier() {
  const value = fields.identifier.input.value.trim();

  if (!value) {
    setFieldError(fields.identifier, "Email is required.");
    return false;
  }

  setFieldSuccess(fields.identifier);
  return true;
}

function validatePassword() {
  const value = fields.password.input.value;

  if (!value) {
    setFieldError(fields.password, "Password is required.");
    return false;
  }

  setFieldSuccess(fields.password);
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

async function submitLogin(payload) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return await response.json();
}

function saveAuthData(data, rememberMe) {
  const storage = rememberMe ? localStorage : sessionStorage;

  storage.setItem("token", data.token);
  storage.setItem("user", JSON.stringify(data.user));
}

async function handleSubmit(event) {
  event.preventDefault();
  showFormMessage("", null);

  const isIdentifierValid = validateIdentifier();
  const isPasswordValid = validatePassword();

  if (!isIdentifierValid || !isPasswordValid) {
    return;
  }

  const payload = {
    email: fields.identifier.input.value.trim(),
    password: fields.password.input.value,
  };

  setLoading(true);

  try {
    const result = await submitLogin(payload);
    const authData = result.data || result;

    if (result.success) {
      if (!authData.token) {
        showFormMessage("Login response does not contain token.", "error");
        return;
      }

      saveAuthData(authData, rememberMeInput.checked);
      showFormMessage(result.message || "Signed in successfully.", "success");
      Object.values(fields).forEach(clearFieldState);

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 100);
    } else {
      showFormMessage(
        result.message || "Invalid credentials. Please try again.",
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
identifierInput.addEventListener("blur", validateIdentifier);
passwordInput.addEventListener("blur", validatePassword);
form.addEventListener("submit", handleSubmit);
