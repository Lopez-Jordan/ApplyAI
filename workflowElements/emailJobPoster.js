export async function findEmailPerson(domain, full_name) {
  try {
    const response = await fetch("https://api.anymailfinder.com/v5.1/find-email/person", {
      method: "POST",
      headers: {
        "Authorization": "YOUR_API_KEY",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ domain, full_name }),
    });

    const data = await response.json();

    if (response.status === 200) {
      if (data.email_status === "valid") {
        console.log(`Valid email found: ${data.email}`);








      } else {
        console.log("Email not found.");
      }
      return;
    }

    if (response.status === 400) {
      console.log("Bad request:", data.message);
    } else if (response.status === 401) {
      console.log("Authentication failed:", data.message);
    } else if (response.status === 402) {
      console.log("Payment required:", data.message);
    } else {
      console.log(`Unknown error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
}