import {
  Body,
  Controller,
  Get,
  HttpCode,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Post } from '@nestjs/common';
import { Request, Response } from 'express';

import { AdminAuthService } from './admin-auth.service';

type LoginBody = {
  username?: string;
  password?: string;
};

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Get('login-page')
  getLoginPage(@Res() response: Response) {
    return response.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Admin Login</title>
    <style>
      :root {
        --bg-1: #090617;
        --bg-2: #1b1140;
        --bg-3: #03243f;
        --card: rgba(14, 13, 36, 0.78);
        --card-border: rgba(173, 133, 255, 0.24);
        --text-main: #f4f0ff;
        --text-soft: #c8c0ea;
        --danger: #ff7f92;
        --action-a: #7c3aed;
        --action-b: #0ea5e9;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        color: var(--text-main);
        background:
          radial-gradient(1200px 700px at -10% -20%, #3f2f82 0%, transparent 55%),
          radial-gradient(900px 500px at 110% 110%, #09517f 0%, transparent 60%),
          linear-gradient(145deg, var(--bg-1), var(--bg-2) 52%, var(--bg-3));
        padding: 20px;
      }

      .shell {
        width: 100%;
        max-width: 420px;
      }

      .card {
        border: 1px solid var(--card-border);
        border-radius: 18px;
        backdrop-filter: blur(12px);
        background: var(--card);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.34);
      }

      .card {
        padding: 24px;
        width: 100%;
      }

      .logo-wrap {
        display: flex;
        justify-content: center;
        margin-bottom: 12px;
      }

      .logo {
        width: 100%;
        max-width: 240px;
        height: auto;
        border-radius: 10px;
        border: 1px solid rgba(167, 139, 250, 0.2);
        box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28);
        background: rgba(255, 255, 255, 0.9);
      }

      .title {
        margin: 0;
        font-size: 24px;
        letter-spacing: 0.2px;
      }

      .sub {
        margin: 8px 0 18px;
        color: var(--text-soft);
        font-size: 13px;
      }

      label {
        display: block;
        margin: 12px 0 7px;
        color: #d7cef8;
        font-size: 13px;
        font-weight: 600;
      }

      .field {
        width: 100%;
        border: 1px solid rgba(167, 139, 250, 0.36);
        border-radius: 12px;
        padding: 11px 12px;
        font-size: 14px;
        color: #fff;
        background: rgba(20, 19, 52, 0.72);
        outline: none;
        transition: border-color 0.18s ease, box-shadow 0.18s ease;
      }

      .field::placeholder {
        color: #8f84b8;
      }

      .field:focus {
        border-color: #8b5cf6;
        box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.22);
      }

      .password-wrap {
        position: relative;
      }

      .toggle {
        position: absolute;
        top: 50%;
        right: 10px;
        transform: translateY(-50%);
        border: 0;
        background: transparent;
        color: #b7a7ef;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        padding: 5px;
      }

      .submit {
        margin-top: 16px;
        width: 100%;
        border: 0;
        border-radius: 12px;
        padding: 11px 12px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 700;
        color: #fff;
        background: linear-gradient(95deg, var(--action-a), var(--action-b));
        transition: transform 0.18s ease, filter 0.18s ease;
      }

      .submit:hover {
        transform: translateY(-1px);
        filter: brightness(1.06);
      }

      .submit:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none;
      }

      #msg {
        margin-top: 12px;
        min-height: 18px;
        color: var(--danger);
        font-size: 13px;
      }

      @media (max-width: 900px) {
        .shell {
          max-width: 420px;
        }

        .card {
          padding: 22px;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <form class="card" id="login-form" autocomplete="off">
        <div class="logo-wrap">
          <img class="logo" src="/assets/images/logo/logomedia.jpg" alt="HUIT Media" />
        </div>
        <h1 class="title">Sign in</h1>
        <p class="sub">Enter your admin credentials to continue.</p>

        <label for="username">Username</label>
        <input class="field" id="username" name="username" placeholder="Enter username" required />

        <label for="password">Password</label>
        <div class="password-wrap">
          <input class="field" id="password" name="password" type="password" placeholder="Enter password" required />
          <button type="button" class="toggle" id="toggle-password">Show</button>
        </div>

        <button class="submit" id="submit-btn" type="submit">Sign in</button>
        <div id="msg" aria-live="polite"></div>
      </form>
    </main>
    <script>
      const form = document.getElementById('login-form');
      const msg = document.getElementById('msg');
      const submitBtn = document.getElementById('submit-btn');
      const passwordInput = document.getElementById('password');
      const togglePassword = document.getElementById('toggle-password');

      togglePassword.addEventListener('click', () => {
        const isHidden = passwordInput.type === 'password';
        passwordInput.type = isHidden ? 'text' : 'password';
        togglePassword.textContent = isHidden ? 'Hide' : 'Show';
      });

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        msg.textContent = '';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
          const response = await fetch('/api/admin/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });

          if (!response.ok) {
            msg.textContent = 'Invalid username or password.';
            return;
          }

          window.location.href = '/admin/index.html';
        } catch (error) {
          msg.textContent = 'Network error. Please try again.';
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign in';
        }
      });
    </script>
  </body>
</html>`);
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginBody, @Res({ passthrough: true }) response: Response) {
    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!username || !password || !(await this.adminAuthService.validateCredentials(username, password))) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const token = this.adminAuthService.createSessionToken(username);
    response.cookie(this.adminAuthService.cookieName, token, this.adminAuthService.getCookieOptions());

    return {
      ok: true,
      username,
    };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(this.adminAuthService.cookieName, this.adminAuthService.getClearCookieOptions());

    return {
      ok: true,
    };
  }

  @Get('me')
  getMe(@Req() request: Request, @Res() response: Response) {
    const token = this.adminAuthService.extractSessionToken(request.headers.cookie);
    const session = token ? this.adminAuthService.verifySessionToken(token) : null;

    if (!session) {
      return response.status(401).json({ authenticated: false });
    }

    return response.json({
      authenticated: true,
      username: session.username,
      expiresAt: session.exp,
    });
  }
}
