<?php

require_once __DIR__ . "/../vendor/autoload.php";
require_once __DIR__ . "/../config/mail.php";

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function sendResetCodeEmail(
    string $toEmail,
    string $resetCode
): bool {
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host = MailConfig::host();
        $mail->SMTPAuth = true;
        $mail->Username = MailConfig::username();
        $mail->Password = MailConfig::password();
        $mail->Port = MailConfig::port();

        if (MailConfig::encryption() === "tls") {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        }

        $mail->setFrom(
            MailConfig::from(),
            MailConfig::fromName()
        );

        $mail->addAddress($toEmail);

        $mail->isHTML(true);
        $mail->Subject = "Your Veritas AI Password Reset Code";

        $mail->Body = "
            <div style='font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;'>
                <h2>Password Reset Request</h2>
                <p>You requested to reset your Veritas AI password.</p>
                <p>Your verification code is:</p>
                <h1 style='letter-spacing: 6px; color: #2563eb;'>{$resetCode}</h1>
                <p>This code will expire in 15 minutes.</p>
                <p>If you did not request this, you can ignore this email.</p>
            </div>
        ";

        $mail->AltBody =
            "Your Veritas AI password reset code is {$resetCode}. This code will expire in 15 minutes.";

        $mail->send();

        return true;

    } catch (Exception $e) {
        error_log("Mail Error: " . $mail->ErrorInfo);

        return false;
    }
}