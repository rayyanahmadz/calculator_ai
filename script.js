/* ============================================================
   GLASS CALCULATOR — script.js
   Vanilla JS calculator logic. No frameworks, no dependencies.

   STATE MODEL
   We track three pieces of state:
     - currentValue   : the number currently being typed/shown
     - previousValue  : the number captured before an operator
                         was pressed
     - operator       : the pending operation ("+", "-", "*", "/")
   A fourth flag, "shouldResetCurrent", tells us whether the next
   digit press should start a fresh number (e.g. right after an
   operator or after "=" was pressed).
============================================================ */

// ---- Grab DOM references once, at startup ----
const currentDisplay = document.getElementById("currentDisplay");
const historyDisplay = document.getElementById("historyDisplay");
const keypad = document.getElementById("keypad");
const calculatorEl = document.getElementById("calculator");
// ---- Calculator state ----
let currentValue = "0";
let previousValue = null;
let operator = null;
let shouldResetCurrent = false;
let pendingFunction = null;   // holds "cos", "sin" etc. while waiting for the number


/**
 * updateDisplay
 * Pushes the current in-memory state onto the screen.
 * Keeps the DOM in sync with our JS state after every action.
 */
function updateDisplay() {
  currentDisplay.textContent = currentValue;
  currentDisplay.classList.remove("is-error");

  if (pendingFunction) {
    // Show e.g. "cos(" while the user types the argument
    historyDisplay.textContent = `${pendingFunction}(`;
  } else if (operator && previousValue !== null) {
    historyDisplay.textContent = `${formatForHistory(previousValue)} ${operatorSymbol(operator)}`;
  } else {
    historyDisplay.textContent = "\u00A0";
  }

  highlightActiveOperator();
}

/**
 * operatorSymbol
 * Converts the internal operator character into the prettier
 * glyph used in the UI (e.g. "*" -> "×").
 */
function operatorSymbol(op) {
  const symbols = { "+": "+", "-": "−", "*": "×", "/": "÷" };
  return symbols[op] || op;
}

/**
 * formatForHistory
 * Trims trailing zeros/decimal points off a raw numeric string
 * so the history line stays clean.
 */
function formatForHistory(value) {
  return value.toString();
}

/**
 * highlightActiveOperator
 * Adds a visual "is-active" state to whichever operator button
 * matches the currently pending operator, so the user always
 * knows what will happen when they press "=".
 */
function highlightActiveOperator() {
  const operatorButtons = keypad.querySelectorAll(".key--operator");
  operatorButtons.forEach((btn) => {
    btn.classList.toggle("is-active", operator !== null && btn.dataset.value === operator);
  });
}

/**
 * inputDigit
 * Appends a digit (0-9) to the current value. Handles the
 * "start fresh" case after an operator or an equals press,
 * and prevents ugly leading zeros like "007".
 */
function inputDigit(digit) {
  if (shouldResetCurrent) {
    currentValue = digit;
    shouldResetCurrent = false;
  } else if (currentValue === "0") {
    currentValue = digit;
  } else {
    currentValue += digit;
  }
  updateDisplay();
}

/**
 * inputDecimal
 * Adds a decimal point, but only if the current number doesn't
 * already have one — prevents malformed numbers like "1.2.3".
 */
function inputDecimal() {
  if (shouldResetCurrent) {
    // Starting a new number that begins with a decimal, e.g. ".5"
    currentValue = "0.";
    shouldResetCurrent = false;
    updateDisplay();
    return;
  }
  if (!currentValue.includes(".")) {
    currentValue += ".";
    updateDisplay();
  }
}

/**
 * chooseOperator
 * Records the operator the user wants to apply. If there's
 * already a pending calculation (previousValue + operator),
 * it resolves that first so operators can be chained,
 * e.g. "4 + 5 + 3" works as expected without pressing "=".
 */
function chooseOperator(nextOperator) {
  if (operator !== null && !shouldResetCurrent) {
    // Resolve the pending operation before starting the next one
    calculateResult();
  }
  previousValue = currentValue;
  operator = nextOperator;
  shouldResetCurrent = true;
  updateDisplay();
}

/**
 * calculateResult
 * Performs the actual arithmetic between previousValue and
 * currentValue using the stored operator. Includes error
 * handling for invalid operations like division by zero.
 */

function calculateResult() {
    
  // If a scientific function is waiting (e.g. "cos("), resolve it first
 if (pendingFunction) {
    const value = parseFloat(currentValue);
    const funcName = pendingFunction;

    const funcResult = computeFunction(funcName, value);
    if (funcResult === null) return;

    currentValue = funcResult.toString();

    // Add scientific calculation to history
    addToHistory(`${funcName}(${value}) = ${funcResult}`);

    pendingFunction = null;
    shouldResetCurrent = true;

    updateDisplay();
    return;
}

  if (operator === null || previousValue === null) {
    updateDisplay();
    return;
  }
  if (operator === null || previousValue === null) return;

  const a = parseFloat(previousValue);
  const b = parseFloat(currentValue);
  let result;

  switch (operator) {
    case "+":
      result = a + b;
      break;
    case "-":
      result = a - b;
      break;
    case "*":
      result = a * b;
      break;
    case "/":
      if (b === 0) {
        // Division by zero is mathematically undefined — show a
        // friendly error instead of letting JS return "Infinity".
        showError("Can't divide by zero");
        return;
      }
      result = a / b;
      break;
    default:
      return;
  }

  // Guard against floating point artifacts (e.g. 0.1 + 0.2 = 0.30000000000000004)
  // by rounding to a sane number of decimal places.
  result = Math.round((result + Number.EPSILON) * 1e10) / 1e10;

  // Guard against results too large to display sensibly
  if (!isFinite(result)) {
    showError("Number too large");
    return;
  }

  currentValue = result.toString();
  addToHistory(`${a} ${operatorSymbol(operator)} ${b} = ${result}`);
  operator = null;
  previousValue = null;
  shouldResetCurrent = true;
  updateDisplay();
}

/**
 * showError
 * Puts the calculator into a visible error state, resets the
 * underlying math state so the next digit press starts clean.
 */
function showError(message) {
  currentDisplay.textContent = message;
  currentDisplay.classList.add("is-error");
  historyDisplay.textContent = "\u00A0";
  currentValue = "0";
  previousValue = null;
  operator = null;
  pendingFunction = null;
  shouldResetCurrent = true;
}

/**
 * clearAll
 * The "AC" button — wipes every piece of state back to the
 * calculator's initial condition.
 */
function clearAll() {
  currentValue = "0";
  previousValue = null;
  operator = null;
  pendingFunction = null;
  shouldResetCurrent = false;
  updateDisplay();
}

/**
 * deleteLastChar
 * The "DEL" button — removes the last character of the current
 * number, similar to a backspace key. Falls back to "0" if the
 * number becomes empty.
 */
function deleteLastChar() {
  if (shouldResetCurrent) return; // nothing sensible to delete right after an operator
  currentValue = currentValue.slice(0, -1);
  if (currentValue === "" || currentValue === "-") {
    currentValue = "0";
  }
  updateDisplay();
}

/**
 * toggleSign
 * The "±" button — flips the current number between positive
 * and negative.
 */
function toggleSign() {
  if (currentValue === "0") return;
  currentValue = currentValue.startsWith("-")
    ? currentValue.slice(1)
    : "-" + currentValue;
  updateDisplay();
}

/**
 * applyPercent
 * The "%" button — converts the current number into its
 * percentage form (divides by 100).
 */
function applyPercent() {
  const value = parseFloat(currentValue);
  if (isNaN(value)) return;
  currentValue = (value / 100).toString();
  updateDisplay();
}
/**
 * applyScientific
 * Applies a scientific function (sin, cos, tan, sqrt, square,
 * log, ln, pi) to the current value. Trig functions use radians.
 */
/**
 * applyScientific
 * Called when a scientific button (sin, cos, sqrt, etc.) is pressed.
 * Instead of computing immediately, it "arms" the function and waits
 * for the user to type a number and press "=" — e.g. cos -> 1 -> =.
 * "pi" is the exception: it has no argument, so it inserts its value
 * right away.
 */
function applyScientific(func) {
  if (func === "pi") {
    currentValue = Math.PI.toString();
    shouldResetCurrent = false;
    updateDisplay();
    return;
  }

  pendingFunction = func;
  currentValue = "0";
  shouldResetCurrent = true;
  updateDisplay();
}

/**
 * computeFunction
 * Does the actual math for a scientific function given a number.
 * Returns null (and shows an error) if the input is invalid for
 * that function, e.g. sqrt of a negative number.
 */
function computeFunction(func, value) {
  let result;

  switch (func) {
    case "sin":
      result = Math.sin(value);
      break;
    case "cos":
      result = Math.cos(value);
      break;
    case "tan":
      result = Math.tan(value);
      break;
    case "sqrt":
      if (value < 0) {
        showError("Invalid input");
        return null;
      }
      result = Math.sqrt(value);
      break;
    case "square":
      result = value * value;
      break;
    case "log":
      if (value <= 0) {
        showError("Invalid input");
        return null;
      }
      result = Math.log10(value);
      break;
    case "ln":
      if (value <= 0) {
        showError("Invalid input");
        return null;
      }
      result = Math.log(value);
      break;
    default:
      return null;
  }

  return Math.round((result + Number.EPSILON) * 1e10) / 1e10;
}

/**
 * flashKey
 * Small visual feedback helper: briefly adds a "pressed" class
 * to a button so on-screen clicks feel as tactile as real ones.
 */
function flashKey(button) {
  button.classList.remove("is-pressed");
  // Force reflow so the animation can restart if pressed rapidly
  void button.offsetWidth;
  button.classList.add("is-pressed");
}

/**
 * handleAction
 * Central dispatcher — takes a button element, reads its
 * data-action/data-value, and routes to the right handler.
 * Used by both mouse/touch clicks and the keyboard listener.
 */
function handleAction(action, value, buttonEl) {
  switch (action) {
    case "digit":
      inputDigit(value);
      break;
    case "decimal":
      inputDecimal();
      break;
    case "operator":
      chooseOperator(value);
      break;
    case "equals":
      calculateResult();
      break;
    case "clear":
      clearAll();
      break;
    case "delete":
      deleteLastChar();
      break;
    case "sign":
      toggleSign();
      break;
    case "percent":
      applyPercent();
      break;
    case "sci":
      applyScientific(value);
      break;
  }
  if (buttonEl) flashKey(buttonEl);
}

// ============================================================
// EVENT LISTENERS
// ============================================================

// Mouse / touch: one listener on the keypad container (event
// delegation) rather than one per button — cleaner and scales
// automatically if buttons are added later.
calculatorEl.addEventListener("click", (event) => {
  const button = event.target.closest(".key");
  if (!button) return;
  const { action, value } = button.dataset;
  handleAction(action, value, button);
});

// Keyboard support: lets the calculator be used entirely without
// a mouse, mapping standard keys to the same actions as the UI.
document.addEventListener("keydown", (event) => {
  const key = event.key;

  if (key >= "0" && key <= "9") {
    handleAction("digit", key, findButton(`[data-action="digit"][data-value="${key}"]`));
  } else if (key === ".") {
    handleAction("decimal", ".", findButton('[data-action="decimal"]'));
  } else if (["+", "-", "*", "/"].includes(key)) {
    handleAction("operator", key, findButton(`[data-action="operator"][data-value="${key}"]`));
  } else if (key === "Enter" || key === "=") {
    event.preventDefault(); // stop Enter from doing anything else (e.g. form submit)
    handleAction("equals", null, findButton('[data-action="equals"]'));
  } else if (key === "Backspace") {
    handleAction("delete", null, findButton('[data-action="delete"]'));
  } else if (key === "Escape") {
    handleAction("clear", null, findButton('[data-action="clear"]'));
  } else if (key === "%") {
    handleAction("percent", null, findButton('[data-action="percent"]'));
  }
});

/**
 * findButton
 * Small helper to look up a keypad button by CSS selector,
 * used so keyboard input can trigger the same flash animation
 * as a real click.
 */
function findButton(selector) {
  return keypad.querySelector(selector);
}
// ---- History panel logic ----
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

function addToHistory(entryText) {
  const item = document.createElement("li");
  item.textContent = entryText;
  historyList.prepend(item); // newest entry on top
}

clearHistoryBtn.addEventListener("click", () => {
  historyList.innerHTML = "";
});
// ---- Copy result to clipboard ----
const copyToast = document.getElementById("copyToast");

currentDisplay.addEventListener("click", () => {
  navigator.clipboard.writeText(currentValue).then(() => {
    copyToast.classList.add("is-visible");
    setTimeout(() => copyToast.classList.remove("is-visible"), 1000);
  });
});
// ---- Scientific panel toggle ----
const sciToggle = document.getElementById("sciToggle");
const sciPanel = document.getElementById("sciPanel");

sciToggle.addEventListener("click", () => {
  sciPanel.classList.toggle("is-open");
  sciToggle.classList.toggle("is-active");
});
// ============================================================
// INITIALIZE
// ============================================================
// ---- Theme toggle ----
const themeToggle = document.getElementById("themeToggle");

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light-theme");
  themeToggle.textContent = document.body.classList.contains("light-theme") ? "☀️" : "🌙";
});
updateDisplay();