const express = require("express");
const request = require("request");
const opn = require("opn");
const { default: axios } = require("axios");

const API_KEY = process.env.PAY_MOB;
const INTEGRATION_ID = 4093262;
const ifameOne =
  "https://accept.paymob.com/api/acceptance/iframes/780592?payment_token=";
const app = express();

// Middleware function for handling PayMob payment
const payMobMiddleware = async (req, res, next) => {
  const Data = req.fetchedPackage;
  const userId = req?.user?._id;
  async function convertUSDToEGP(amountInUSD) {
    try {
      // Fetch exchange rate from an API (example using exchangerate-api.com)
      const apiURL = "https://api.exchangerate-api.com/v4/latest/USD";
      const response = await axios.get(apiURL);
      const exchangeRate = response.data.rates.EGP;

      // Calculate conversion
      const amountInEGP = amountInUSD * exchangeRate;

      return amountInEGP.toFixed(2); // Return converted amount rounded to 2 decimal places
    } catch (error) {
      console.error("Error fetching exchange rate:", error.message);
      throw new Error("Failed to fetch exchange rate");
    }
  }

  if (Data?.price) {
    const price = await convertUSDToEGP(Data?.price);
    console.log(price);
    request.post(
      "https://accept.paymob.com/api/auth/tokens",
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: API_KEY }),
      },
      (error, response, body) => {
        if (error) {
          return res.json({ error: "An error occurred" });
        }
        const token = JSON.parse(body).token;
        request.post(
          "https://accept.paymob.com/api/ecommerce/orders",
          {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              auth_token: token,
              delivery_needed: "false",
              amount_cents: price * 100,
              currency: "EGP",
              items: [
                {
                  name: userId,
                  amount_cents: price * 100,
                  description: userId,
                },
              ],
            }),
          },
          (error, response, body) => {
            if (error) {
              return res.json({ error: "An error occurred" });
            }
            const orderId = JSON.parse(body).id;

            request.post(
              "https://accept.paymob.com/api/acceptance/payment_keys",
              {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  auth_token: token,
                  amount_cents: price * 100,
                  expiration: 3600,
                  order_id: orderId,
                  billing_data: {
                    apartment: "resourceId",
                    email: "claudette09@exa.com",
                    floor: "42",
                    first_name: "Clifford",
                    street: "Ethan Land",
                    building: "8028",
                    phone_number: "+86(8)9135210487",
                    shipping_method: "PKG",
                    postal_code: "01898",
                    city: "Jaskolskiburgh",
                    country: "CR",
                    last_name: "Nicolas",
                    state: "Utah",
                  },
                  currency: "EGP",
                  integration_id: INTEGRATION_ID,
                }),
              },
              (error, response, body) => {
                if (error) {
                  return res.json({ error: "An error occurred" });
                }
                const paymentToken = JSON.parse(body).token;
                const paymentLink = ifameOne + paymentToken;
                req.paymentLink = paymentLink;
                // opn(paymentLink);
                next();
              }
            );
          }
        );
      }
    );
  }
};
module.exports = {
  payMobMiddleware,
};
