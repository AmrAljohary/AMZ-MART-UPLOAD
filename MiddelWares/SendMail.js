const nodemailer = require("nodemailer");
require("dotenv").config();
const user = process.env.EMAIL;
const pass = process.env.PASSWORD;

var smtpTransport = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true, 
  debug: true,
  auth: {
    user: user,
    pass: pass,
  },
});

// var smtpTransport = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: user,
//     pass: pass,
//   },
// });
module.exports.sendVerifyEmail = async (email, name, otp) => {
  await smtpTransport.sendMail({
    from: user,
    to: email,
    subject: "كود تفعيل",
    text: `مرحباً بك، ${name}
رمز تأكيد حسابك هو: ${otp}
`,
    html: `<p>مرحباً بك، ${name}</p>
<p>رمز تأكيد حسابك هو: ${otp}</p>
`,
  });
};

module.exports.sendResetOTP = async (email, otp) => {
  await smtpTransport.sendMail({
    from: user,
    to: email,
    subject: "كود استعادة كلمة المرور",
    text: `${otp}`,
    html: `${otp}`,
  });
};
module.exports.sendInvitationCode = async (email, Code) => {
  await smtpTransport.sendMail({
    from: user,
    to: email,
    subject: "كود الدعوة الخاص بك ",
    text: `كود الدعوة الخاص بك هو:${Code}`,
    html: `كود الدعوة الخاص بك هو:${Code}`,
  });
};
module.exports.sendRejectedCode = async (email, rejectionMessage) => {
  await smtpTransport.sendMail({
    from: user,
    to: email,
    subject: "تم رفض الطلب الخاص بك",
    text: rejectionMessage,
    html: rejectionMessage,
  });
};
