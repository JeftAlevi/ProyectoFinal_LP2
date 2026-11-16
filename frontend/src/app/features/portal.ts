import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Auth } from '../auth';
import { mensaje } from '../api';
import { ArticuloPublico } from '../api-tipos';

@Component({
  imports: [FormsModule, RouterLink],
  template: `
    <main class="public-site">
      <header class="public-nav">
        <a class="brand" routerLink="/" aria-label="Maíz ERP, inicio">
          <span class="brand-mark">M</span>
          <span>MAÍZ <i>/</i> ERP<small>Producción y comercialización</small></span>
        </a>
        <nav aria-label="Navegación principal">
          <a href="#catalogo">Productos</a>
          <a href="#contacto">Contacto</a>
        </nav>
        <!-- /panel exige sesión: si no la hay, el guard "autenticado" abre el login de Keycloak. -->
        <a class="staff-link" routerLink="/panel">
          <span class="staff-icon">↗</span>{{ auth.token() ? 'Abrir sistema' : 'Acceso del personal' }}
        </a>
      </header>

      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow"><span class="eyebrow-dot"></span> DEL CAMPO A TU NEGOCIO</span>
          <h1>Producción que conecta.<br /><em>Productos que cumplen.</em></h1>
          <p>
            Conoce nuestros productos terminados y conversa con nuestro equipo comercial para atender tu
            negocio.
          </p>
          <div class="hero-actions">
            <a class="button-primary" href="#catalogo">Explorar productos <span>↓</span></a>
            <a class="button-secondary" href="#contacto">Hablar con ventas <span>↗</span></a>
          </div>
          <div class="hero-note"><span class="note-check">✓</span> Calidad y atención en un solo lugar</div>
        </div>
        <div class="hero-art" aria-label="Ilustración abstracta de cultivos y producción" role="img">
          <div class="art-sun"></div>
          <div class="art-field field-back"></div>
          <div class="art-field field-front"></div>
          <div class="grain-stalk stalk-one"><i></i><i></i><i></i><i></i><b></b></div>
          <div class="grain-stalk stalk-two"><i></i><i></i><i></i><i></i><b></b></div>
          <div class="art-caption">
            <span>MAÍZ ERP</span><strong>Del origen<br />al producto final.</strong
            ><small>Producción · calidad · despacho</small>
          </div>
          <div class="art-seal">
            <span>✳</span><small>GESTIÓN<br />INTEGRADA</small>
          </div>
        </div>
      </section>

      <section class="catalog-section" id="catalogo">
        <div class="section-heading">
          <div>
            <span class="eyebrow">NUESTRO CATÁLOGO</span>
            <h2>Productos para tu operación</h2>
            <p>Consulta con el equipo comercial para conocer presentaciones y disponibilidad.</p>
          </div>
          <span class="catalog-count"
            >{{ productos().length }} {{ productos().length === 1 ? 'producto' : 'productos' }}</span
          >
        </div>
        @if (error()) {
          <p class="catalog-error" role="alert">{{ error() }}</p>
        }
        <div class="product-grid">
          @for (p of productos(); track p.codigo) {
            <article class="product-card">
              <div class="product-top">
                <span class="product-symbol">✳</span><span class="product-code">{{ p.codigo }}</span>
              </div>
              <div>
                <h3>{{ p.nombre }}</h3>
                <p>
                  {{
                    p.descripcion ||
                      'Consulta con nuestro equipo comercial para conocer más sobre este producto.'
                  }}
                </p>
              </div>
              <a href="#contacto" class="product-link">Consultar producto <span>↗</span></a>
            </article>
          } @empty {
            @if (!error()) {
              <div class="empty-catalog">
                <span>✳</span>
                <h3>Estamos preparando el catálogo</h3>
                <p>Vuelve pronto o escríbenos para consultar por nuestros productos.</p>
                <a href="#contacto">Contactar al equipo <span>↗</span></a>
              </div>
            }
          }
        </div>
      </section>

      <section class="contact-section" id="contacto">
        <div class="contact-copy">
          <span class="eyebrow">ATENCIÓN COMERCIAL</span>
          <h2>Conversemos sobre lo que necesitas.</h2>
          <p>Déjanos tus datos y un mensaje. La solicitud llegará a nuestro equipo de ventas.</p>
          <div class="contact-points">
            <span><i>01</i> Cuéntanos qué buscas</span><span><i>02</i> Nuestro equipo te contactará</span
            ><span><i>03</i> Revisamos juntos la propuesta</span>
          </div>
        </div>
        <div class="contact-card">
          <div class="contact-card-head">
            <span class="contact-icon">✉</span>
            <div>
              <h3>Enviar una consulta</h3>
              <p>Te responderemos a tu correo.</p>
            </div>
          </div>
          <form (ngSubmit)="enviar()" #f="ngForm">
            <label
              >Nombre<input
                name="nombre"
                [(ngModel)]="contacto.nombre"
                required
                maxlength="120"
                placeholder="Tu nombre"
            /></label>
            <label
              >Correo electrónico<input
                name="email"
                type="email"
                [(ngModel)]="contacto.email"
                required
                email
                placeholder="nombre@empresa.com"
            /></label>
            <label
              >¿En qué podemos ayudarte?<textarea
                name="mensaje"
                [(ngModel)]="contacto.mensaje"
                required
                maxlength="1000"
                rows="4"
                placeholder="Escribe tu consulta..."
              ></textarea>
            </label>
            <button class="button-primary send-button" [disabled]="f.invalid || ocupado()">
              {{ ocupado() ? 'Enviando…' : 'Enviar consulta' }} <span>↗</span>
            </button>
            <p class="form-status" role="status">{{ estado() }}</p>
          </form>
        </div>
      </section>

      <footer class="public-footer">
        <a class="footer-brand" routerLink="/">MAÍZ <i>/</i> ERP</a><span>Producción y comercialización</span
        ><span>© {{ anio }} Maíz ERP</span>
      </footer>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        --forest: #173f31;
        --forest2: #245840;
        --lime: #dce9a6;
        --gold: #d4aa4d;
        --paper: #f5f6ef;
        --ink: #18251f;
        --muted: #68766d;
        --line: #e1e6dc;
        font-family: 'Segoe UI', Arial, sans-serif;
        color: var(--ink);
      }
      .public-site {
        min-height: 100vh;
        background: var(--paper);
        overflow: hidden;
      }
      .public-nav {
        max-width: 1240px;
        margin: auto;
        height: 88px;
        padding: 0 34px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 28px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--ink);
        font-weight: 800;
        letter-spacing: 0.4px;
      }
      .brand-mark {
        width: 42px;
        height: 42px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        background: var(--forest);
        color: #fff;
        font-size: 21px;
      }
      .brand i,
      .footer-brand i {
        font-style: normal;
        color: #a6bb68;
      }
      .brand small {
        display: block;
        margin-top: 3px;
        color: var(--muted);
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.2px;
      }
      .public-nav nav {
        display: flex;
        align-items: center;
        gap: 32px;
        margin-left: auto;
        margin-right: 20px;
      }
      .public-nav nav a {
        font-size: 13px;
        font-weight: 600;
        color: #536259;
      }
      .public-nav nav a:hover,
      .product-link:hover {
        color: var(--forest2);
      }
      .staff-link {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        border: 1px solid #cbd5c9;
        padding: 11px 15px;
        border-radius: 10px;
        background: #fff;
        color: var(--forest);
        font-weight: 700;
        font-size: 12px;
        box-shadow: 0 5px 18px #203b2710;
        transition: 0.2s;
      }
      .staff-link:hover {
        border-color: var(--forest);
        transform: translateY(-1px);
      }
      .staff-icon {
        display: grid;
        place-items: center;
        width: 23px;
        height: 23px;
        border-radius: 7px;
        background: #edf3e8;
        font-size: 15px;
      }
      .hero {
        max-width: 1240px;
        min-height: 480px;
        margin: 14px auto 0;
        padding: 32px 34px 54px;
        display: grid;
        grid-template-columns: 1fr 0.9fr;
        align-items: center;
        gap: 40px;
      }
      .hero-copy {
        padding: 10px 0 4px;
      }
      .eyebrow {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 10px;
        letter-spacing: 1.7px;
        font-weight: 800;
        color: #55735a;
      }
      .eyebrow-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #91a94e;
      }
      .hero h1 {
        font-size: clamp(40px, 5vw, 66px);
        line-height: 1.04;
        letter-spacing: -2.8px;
        margin: 22px 0 20px;
        color: #17251f;
        font-weight: 760;
      }
      .hero h1 em {
        font-style: normal;
        color: var(--forest2);
      }
      .hero-copy > p {
        max-width: 530px;
        font-size: 16px;
        line-height: 1.7;
        color: #66746b;
        margin: 0;
      }
      .hero-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 30px;
        flex-wrap: wrap;
      }
      .button-primary,
      .button-secondary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 18px;
        min-height: 48px;
        padding: 0 18px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 700;
        text-decoration: none;
        transition:
          transform 0.18s,
          background 0.18s;
      }
      .button-primary {
        border: 0;
        background: var(--forest);
        color: #fff;
      }
      .button-primary:hover:not(:disabled) {
        background: #235640;
        transform: translateY(-2px);
      }
      .button-secondary {
        color: var(--forest);
        border: 1px solid #d4ddd1;
        background: #fff;
      }
      .button-secondary:hover {
        transform: translateY(-2px);
        border-color: #92a78e;
      }
      .hero-note {
        display: flex;
        align-items: center;
        gap: 9px;
        margin-top: 27px;
        color: #67756a;
        font-size: 12px;
      }
      .note-check {
        width: 19px;
        height: 19px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: #e4ecd5;
        color: #496c42;
        font-size: 11px;
        font-weight: 800;
      }
      .hero-art {
        height: 370px;
        position: relative;
        overflow: hidden;
        border-radius: 30px;
        background: linear-gradient(150deg, #e7edcf 0%, #cbd8a5 48%, #809b69 100%);
        box-shadow: 0 22px 55px #294b291d;
      }
      .hero-art:before {
        content: '';
        position: absolute;
        inset: 0;
        background:
          linear-gradient(115deg, transparent 35%, #f9f7df35 36%, transparent 73%),
          radial-gradient(ellipse at 80% 12%, #fff9d18c 0 8%, transparent 28%);
      }
      .art-sun {
        position: absolute;
        width: 112px;
        height: 112px;
        border-radius: 50%;
        right: 20%;
        top: 38px;
        background: #f1dda0;
        filter: blur(0.2px);
        opacity: 0.9;
      }
      .art-field {
        position: absolute;
        left: -12%;
        right: -12%;
        height: 55%;
        border-radius: 50% 50% 0 0/18% 18% 0 0;
        transform: rotate(-7deg);
      }
      .field-back {
        bottom: -9%;
        background: linear-gradient(160deg, #9eb77b, #5c8156);
      }
      .field-front {
        bottom: -31%;
        height: 56%;
        background: linear-gradient(165deg, #496e4d, #244b3a);
      }
      .grain-stalk {
        position: absolute;
        bottom: 48px;
        width: 8px;
        height: 205px;
        border-radius: 100%;
        background: #476f43;
        transform: rotate(-8deg);
        z-index: 2;
      }
      .stalk-one {
        left: 62%;
        height: 220px;
      }
      .stalk-two {
        left: 77%;
        height: 178px;
        transform: rotate(9deg);
      }
      .grain-stalk b {
        position: absolute;
        width: 28px;
        height: 82px;
        border-radius: 50%;
        background: repeating-linear-gradient(0deg, #d7ae4d 0 8px, #e6c66d 8px 13px);
        left: -10px;
        top: 22px;
        transform: rotate(9deg);
        box-shadow: 0 2px 8px #73571e33;
      }
      .grain-stalk i {
        position: absolute;
        width: 55px;
        height: 18px;
        border-radius: 100% 0 100% 0;
        background: #6e914d;
        left: -47px;
        top: 90px;
        transform: rotate(20deg);
      }
      .grain-stalk i:nth-child(2) {
        top: 121px;
        left: 0;
        transform: rotate(160deg);
      }
      .grain-stalk i:nth-child(3) {
        top: 151px;
        left: -42px;
        transform: rotate(20deg);
      }
      .grain-stalk i:nth-child(4) {
        top: 174px;
        left: 0;
        transform: rotate(160deg);
      }
      .art-caption {
        position: absolute;
        z-index: 3;
        left: 28px;
        bottom: 27px;
        color: #fff;
      }
      .art-caption span {
        display: block;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 2px;
        color: #e4edc3;
        margin-bottom: 9px;
      }
      .art-caption strong {
        font-family: Georgia, serif;
        font-size: 25px;
        line-height: 1.1;
      }
      .art-caption small {
        display: block;
        margin-top: 10px;
        color: #e4ebd7;
        font-size: 10px;
      }
      .art-seal {
        position: absolute;
        z-index: 4;
        top: 24px;
        left: 24px;
        width: 82px;
        height: 82px;
        border: 1px solid #ffffff8c;
        border-radius: 50%;
        display: grid;
        place-content: center;
        text-align: center;
        color: white;
        background: #ffffff16;
        backdrop-filter: blur(4px);
      }
      .art-seal span {
        font-size: 22px;
        line-height: 1;
      }
      .art-seal small {
        font-size: 7px;
        line-height: 1.3;
        letter-spacing: 1px;
        margin-top: 3px;
      }
      .catalog-section {
        max-width: 1240px;
        margin: 0 auto;
        padding: 44px 34px 72px;
      }
      .section-heading {
        display: flex;
        justify-content: space-between;
        align-items: end;
        gap: 24px;
        margin-bottom: 24px;
      }
      .section-heading h2,
      .contact-copy h2 {
        font-size: clamp(27px, 3vw, 38px);
        letter-spacing: -1.1px;
        line-height: 1.13;
        margin: 11px 0;
        color: #1b2c23;
      }
      .section-heading p,
      .contact-copy > p {
        margin: 0;
        color: var(--muted);
        font-size: 13px;
      }
      .catalog-count {
        border: 1px solid var(--line);
        border-radius: 999px;
        background: #fff;
        padding: 9px 13px;
        color: #607062;
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
      }
      .product-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
      }
      .product-card {
        min-height: 224px;
        border: 1px solid #e4e8df;
        border-radius: 16px;
        background: #fff;
        padding: 21px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: 0 8px 26px #263c2c08;
        transition:
          transform 0.2s,
          box-shadow 0.2s;
      }
      .product-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 16px 36px #263c2c14;
      }
      .product-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .product-symbol {
        width: 36px;
        height: 36px;
        border-radius: 11px;
        display: grid;
        place-items: center;
        background: #f2f5e9;
        color: #a77d27;
        font-size: 20px;
      }
      .product-code {
        color: #66805d;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 1.4px;
      }
      .product-card h3 {
        font-size: 18px;
        margin: 20px 0 7px;
        color: #1d2b22;
      }
      .product-card p {
        margin: 0;
        color: #758078;
        font-size: 12px;
        line-height: 1.6;
      }
      .product-link {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 18px;
        padding-top: 13px;
        border-top: 1px solid #edf0e9;
        color: #456b4b;
        font-size: 11px;
        font-weight: 750;
      }
      .empty-catalog {
        grid-column: 1/-1;
        padding: 40px;
        border: 1px dashed #cbd6c4;
        border-radius: 16px;
        text-align: center;
        background: #fbfcf8;
      }
      .empty-catalog > span {
        font-size: 25px;
        color: #a77d27;
      }
      .empty-catalog h3 {
        margin: 12px 0 6px;
      }
      .empty-catalog p {
        color: var(--muted);
        font-size: 13px;
      }
      .empty-catalog a {
        color: #456b4b;
        font-weight: 700;
        font-size: 12px;
      }
      .catalog-error {
        padding: 13px 16px;
        border-radius: 10px;
        background: #fff1ee;
        color: #9d4037;
      }
      .contact-section {
        position: relative;
        background: #e9eddf;
        padding: 68px max(34px, calc((100% - 1172px) / 2));
        display: grid;
        grid-template-columns: 0.9fr 1.1fr;
        align-items: center;
        gap: clamp(32px, 7vw, 100px);
      }
      .contact-copy h2 {
        max-width: 440px;
        margin-top: 15px;
      }
      .contact-copy > p {
        max-width: 430px;
        line-height: 1.7;
      }
      .contact-points {
        display: grid;
        gap: 13px;
        margin-top: 30px;
      }
      .contact-points span {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 12px;
        font-weight: 650;
        color: #405648;
      }
      .contact-points i {
        display: grid;
        place-items: center;
        width: 27px;
        height: 27px;
        border-radius: 50%;
        background: #fff;
        color: #719057;
        font-style: normal;
        font-size: 9px;
        font-weight: 800;
      }
      .contact-card {
        max-width: 520px;
        width: 100%;
        justify-self: end;
        background: #fff;
        border: 1px solid #e4e8df;
        border-radius: 18px;
        padding: 25px;
        box-shadow: 0 17px 45px #253c2912;
      }
      .contact-card-head {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
      }
      .contact-icon {
        width: 41px;
        height: 41px;
        border-radius: 12px;
        background: #eff3e5;
        color: #4f7454;
        display: grid;
        place-items: center;
        font-size: 18px;
      }
      .contact-card-head h3 {
        font-size: 16px;
        margin: 0 0 4px;
      }
      .contact-card-head p {
        font-size: 11px;
        color: var(--muted);
        margin: 0;
      }
      .contact-card form {
        display: grid;
        gap: 13px;
      }
      .contact-card label {
        display: grid;
        gap: 7px;
        color: #59685c;
        font-size: 11px;
        font-weight: 650;
      }
      .contact-card input,
      .contact-card textarea {
        width: 100%;
        border: 1px solid #dce3d9;
        border-radius: 9px;
        background: #fbfcf9;
        padding: 11px 12px;
        color: #26372b;
        font: inherit;
        font-size: 12px;
        outline: none;
      }
      .contact-card input:focus,
      .contact-card textarea:focus {
        border-color: #809b6b;
        box-shadow: 0 0 0 3px #809b6b22;
      }
      .contact-card textarea {
        resize: vertical;
        min-height: 90px;
      }
      .send-button {
        width: 100%;
        justify-content: space-between;
        cursor: pointer;
      }
      .send-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .form-status {
        min-height: 16px;
        color: #52764a;
        font-size: 11px;
        margin: 0;
      }
      .public-footer {
        max-width: 1240px;
        margin: auto;
        min-height: 78px;
        padding: 18px 34px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        color: #7b877d;
        font-size: 10px;
      }
      .footer-brand {
        color: #293b2d;
        font-weight: 850;
        letter-spacing: 0.6px;
        font-size: 12px;
      }
      @media (max-width: 850px) {
        .hero {
          grid-template-columns: 1fr 0.8fr;
          gap: 22px;
        }
        .hero-art {
          height: 330px;
        }
        .hero h1 {
          font-size: clamp(38px, 6vw, 54px);
        }
        .contact-section {
          gap: 30px;
        }
        .public-nav nav {
          gap: 18px;
        }
      }
      @media (max-width: 650px) {
        .public-nav {
          height: 72px;
          padding: 0 18px;
        }
        .public-nav nav {
          display: none;
        }
        .staff-link {
          font-size: 11px;
          padding: 9px 10px;
        }
        .brand-mark {
          width: 37px;
          height: 37px;
        }
        .hero {
          grid-template-columns: 1fr;
          padding: 35px 20px 46px;
          margin: 0;
          gap: 28px;
        }
        .hero h1 {
          font-size: clamp(39px, 11vw, 55px);
          letter-spacing: -1.8px;
        }
        .hero-copy > p {
          font-size: 14px;
        }
        .hero-art {
          height: 280px;
          border-radius: 22px;
        }
        .grain-stalk {
          bottom: 22px;
        }
        .catalog-section {
          padding: 46px 20px 54px;
        }
        .section-heading {
          align-items: start;
          flex-direction: column;
          gap: 12px;
        }
        .product-grid {
          grid-template-columns: 1fr;
        }
        .product-card {
          min-height: 190px;
        }
        .contact-section {
          padding: 48px 20px;
          grid-template-columns: 1fr;
          gap: 28px;
        }
        .contact-card {
          justify-self: stretch;
          max-width: none;
          padding: 20px;
        }
        .public-footer {
          padding: 18px 20px;
          flex-wrap: wrap;
        }
        .public-footer span:last-child {
          width: 100%;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          scroll-behavior: auto !important;
          transition-duration: 0.01ms !important;
        }
      }
    `,
  ],
})
export class Portal {
  http = inject(HttpClient);
  auth = inject(Auth);
  productos = signal<ArticuloPublico[]>([]);
  error = signal('');
  estado = signal('');
  ocupado = signal(false);
  anio = new Date().getFullYear();
  contacto = { nombre: '', email: '', mensaje: '' };

  constructor() {
    this.http.get<ArticuloPublico[]>('/api/articulos/catalogo-publico').subscribe({
      next: (r) => this.productos.set(r),
      error: (e) => this.error.set(mensaje(e)),
    });
  }

  enviar() {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.estado.set('');
    this.http.post('/api/portal/contacto', this.contacto).subscribe({
      next: () => {
        this.estado.set('Solicitud registrada. Gracias por contactarnos.');
        this.contacto = { nombre: '', email: '', mensaje: '' };
        this.ocupado.set(false);
      },
      error: (e) => {
        this.estado.set(mensaje(e));
        this.ocupado.set(false);
      },
    });
  }
}
