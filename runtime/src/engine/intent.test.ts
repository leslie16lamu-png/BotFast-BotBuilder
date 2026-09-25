import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectPurchaseIntent } from './intent.ts';

describe('detectPurchaseIntent — casos que deben dar true', () => {
  const shouldBeTrue = [
    'quiero reservar una mesa',
    'cuánto cuesta y cómo pago',
    'quiero uno de esos',
    'me lo llevo',
    'sacar cita',
    'necesito cotizar el servicio',
  ];

  for (const text of shouldBeTrue) {
    it(`detecta intención en: "${text}"`, () => {
      assert.equal(detectPurchaseIntent(text), true, `Esperaba true para: ${text}`);
    });
  }
});

describe('detectPurchaseIntent — casos que deben dar false', () => {
  const shouldBeFalse = [
    'no comprendo tu respuesta',
    '¿tienen todo en orden?',
    '¿cuál es su horario?',
    'solo estoy viendo información',
    'qué colores manejan',
    'gracias por la información',
  ];

  for (const text of shouldBeFalse) {
    it(`no detecta intención en: "${text}"`, () => {
      assert.equal(detectPurchaseIntent(text), false, `Esperaba false para: ${text}`);
    });
  }
});

describe('detectPurchaseIntent — bordes', () => {
  it('texto vacío -> false', () => {
    assert.equal(detectPurchaseIntent(''), false);
    assert.equal(detectPurchaseIntent('   '), false);
  });

  it('normaliza acentos y mayúsculas', () => {
    assert.equal(detectPurchaseIntent('QUIERO RESERVAR'), true);
    assert.equal(detectPurchaseIntent('Cuánto cuesta y CÓMO PAGO'), true);
  });

  it('comprendo / comprensible no debe dar falso positivo', () => {
    assert.equal(detectPurchaseIntent('comprendo tu punto'), false);
    assert.equal(detectPurchaseIntent('es comprensible'), false);
  });

  it('orden suelto no debe dar positivo, ordenar sí', () => {
    assert.equal(detectPurchaseIntent('todo en orden'), false);
    assert.equal(detectPurchaseIntent('quiero ordenar una pizza'), true);
  });
});
