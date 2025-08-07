console.log("📚 Book Finder loaded");

document.getElementById("search-btn").addEventListener("click", () => {
  const query = document.getElementById("search-input").value.trim();
  if (query) {
    alert(`You searched for: ${query}`);
  }
});