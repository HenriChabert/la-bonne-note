const apiKeyInput = document.getElementById("apiKey");
const minRatingInput = document.getElementById("minRating");
const minRatingValue = document.getElementById("minRatingValue");
const minReviewsInput = document.getElementById("minReviews");
const modeDimBtn = document.getElementById("modeDim");
const modeHideBtn = document.getElementById("modeHide");
const saveBtn = document.getElementById("save");
const statusEl = document.getElementById("status");

let filterMode = "dim";

function updateRatingLabel() {
  const val = parseFloat(minRatingInput.value);
  minRatingValue.textContent = val === 0 ? "Off" : val.toFixed(1);
}

function setMode(mode) {
  filterMode = mode;
  modeDimBtn.classList.toggle("active", mode === "dim");
  modeHideBtn.classList.toggle("active", mode === "hide");
}

minRatingInput.addEventListener("input", updateRatingLabel);
modeDimBtn.addEventListener("click", () => setMode("dim"));
modeHideBtn.addEventListener("click", () => setMode("hide"));

// Load saved settings
chrome.storage.sync.get(
  ["placesApiKey", "filterMinRating", "filterMinReviews", "filterMode"],
  (s) => {
    if (s.placesApiKey) {
      apiKeyInput.value = s.placesApiKey;
      statusEl.textContent = "Key saved";
      statusEl.className = "saved";
    }
    if (s.filterMinRating != null) {
      minRatingInput.value = s.filterMinRating;
    }
    if (s.filterMinReviews != null) {
      minReviewsInput.value = s.filterMinReviews;
    }
    if (s.filterMode) {
      setMode(s.filterMode);
    }
    updateRatingLabel();
  }
);

saveBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    statusEl.textContent = "Please enter an API key";
    statusEl.className = "error";
    return;
  }

  const settings = {
    placesApiKey: key,
    filterMinRating: parseFloat(minRatingInput.value) || 0,
    filterMinReviews: parseInt(minReviewsInput.value, 10) || 0,
    filterMode: filterMode,
  };

  chrome.storage.sync.set(settings, () => {
    statusEl.textContent = "Saved!";
    statusEl.className = "saved";
  });
});
