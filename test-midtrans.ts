import "dotenv/config";

async function testMidtrans() {
  const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const midtransBaseUrl = isProd
    ? "https://api.midtrans.com/v2/charge"
    : "https://api.sandbox.midtrans.com/v2/charge";
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
  const authString = Buffer.from(`${serverKey}:`).toString("base64");

  const finalPrice = 1000;
  const chargePayload = {
    payment_type: "qris",
    transaction_details: {
      order_id: "test-" + Date.now(),
      gross_amount: finalPrice,
    },
    qris: {
      acquirer: "gopay",
    },
  };

  const midtransRes = await fetch(midtransBaseUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${authString}`,
    },
    body: JSON.stringify(chargePayload),
  });

  const midtransData = await midtransRes.json();
  console.log(JSON.stringify(midtransData, null, 2));
}

testMidtrans().catch(console.error);
