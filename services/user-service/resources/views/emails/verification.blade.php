<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Ajo App - Email Verification</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #4F46E5;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9fafb;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .otp-code {
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            background-color: #e5e7eb;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            letter-spacing: 5px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Ajo App</h1>
        </div>
        <div class="content">
            <h2>Email Verification</h2>
            <p>Hello,</p>
            <p>Thank you for registering with Ajo App! Please verify your email address to complete your account setup and start using our services.</p>
            
            <p>Your verification code is:</p>
            
            <div class="otp-code">{{ $otp }}</div>
            
            <p>Enter this code in the app to verify your email address. This code will expire in 10 minutes.</p>
            
            <p>If you did not create an account with Ajo App, please ignore this email.</p>
            
            <p>Best regards,<br>The Ajo App Team</p>
        </div>
        <div class="footer">
            <p>This email was sent for email verification purposes. If you have any questions, please contact our support team.</p>
            <p>&copy; {{ date('Y') }} Ajo App. All rights reserved.</p>
        </div>
    </div>
</body>
</html>