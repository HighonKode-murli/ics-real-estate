function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export async function onRequestPost({ request, env }) {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
        return Response.json({ error: "Email service is not configured." }, { status: 500 });
    }

    const formData = await request.formData();
    const fields = {
        "Full name": formData.get("bb-name"),
        "Phone number": formData.get("bb-phone"),
        "Email address": formData.get("bb-email"),
        "Property type": formData.get("bb-property-type"),
        "Preferred area": formData.get("bb-area"),
        "Preferred date": formData.get("bb-date"),
        "Additional requirements": formData.get("bb-message")
    };

    if (!fields["Full name"] || !fields["Phone number"] || !fields["Email address"]) {
        return Response.json({ error: "Please complete the required fields." }, { status: 400 });
    }

    const rows = Object.entries(fields)
        .map(([label, value]) => `<tr><th align="left">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
        .join("");

    const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: env.RESEND_FROM_EMAIL,
            to: ["icsrealestatellcuae@gmail.com"],
            reply_to: fields["Email address"],
            subject: "New enquiry from ICS Real Estate website",
            html: `<h2>New website enquiry</h2><table cellpadding="8" cellspacing="0" border="1">${rows}</table>`
        })
    });

    if (!resendResponse.ok) {
        return Response.json({ error: "Email delivery failed." }, { status: 502 });
    }

    return Response.json({ success: true });
}