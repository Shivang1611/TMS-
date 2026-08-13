const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

// Configure Nodemailer transporter (SMTP defaults to console/mock for dev if unconfigured)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true', 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const templatesCache = {};

/**
 * Load and compile a Handlebars template
 * @param {string} templateName - Name of the file (without .hbs)
 */
const loadTemplate = (templateName) => {
  if (templatesCache[templateName]) {
    return templatesCache[templateName];
  }

  const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.hbs`);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template ${templateName} not found at ${templatePath}`);
  }

  const source = fs.readFileSync(templatePath, 'utf8');
  const compiled = handlebars.compile(source);
  templatesCache[templateName] = compiled;
  
  return compiled;
};

/**
 * Send an email using a Handlebars template
 * @param {Object} options 
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.template - Template name
 * @param {Object} options.context - Variables for template
 */
const sendTemplateEmail = async ({ to, subject, template, context }) => {
  const compiledTemplate = loadTemplate(template);
  const html = compiledTemplate(context);

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"TMS Notifications" <noreply@tms.com>',
    to,
    subject,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

module.exports = {
  sendTemplateEmail,
  transporter,
};
