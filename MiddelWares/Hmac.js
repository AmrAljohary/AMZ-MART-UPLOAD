const crypto = require("crypto");
const hmacSecret = process.env.HMAC;

// Middleware function to verify HMAC
function verifyHmac(req, res, next) {
  const receivedHmac = req.query.hmac;

  function calculateHmac(data) {
    const keys = [
      "amount_cents",
      "created_at",
      "currency",
      "error_occured",
      "has_parent_transaction",
      "id",
      "integration_id",
      "is_3d_secure",
      "is_auth",
      "is_capture",
      "is_refunded",
      "is_standalone_payment",
      "is_voided",
      "order",
      "owner",
      "pending",
      "source_data.pan",
      "source_data.sub_type",
      "source_data.type",
      "success",
    ];
    keys.sort();
    const hmacString = keys.map((key) => data[key]).join("");
    const calculatedHmac = crypto
      .createHmac("sha512", hmacSecret)
      .update(hmacString)
      .digest("hex");

    return calculatedHmac;
  }
  const requestData = req.query;
  const calculatedHmac = calculateHmac(requestData);
  console.log(calculatedHmac);
  if (receivedHmac === calculatedHmac) {
    next();
  } else {
    res.status(400).json({ success: false, error: "HMAC verification failed" });
  }
}

module.exports = { verifyHmac };
