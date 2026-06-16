const input = document.getElementById('country-input');
const button = document.getElementById('search-button');
const result = document.getElementById('result');

button.addEventListener('click', () => {
  const countryName = input.value.trim();
  if (!countryName) {
    showError('Por favor ingresa el nombre de un país.');
    return;
  }
  fetchCountry(countryName);
});

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    button.click();
  }
});

async function fetchCountry(name) {
  result.innerHTML = '<p class="info">Consultando información...</p>';
  try {
    const response = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(name)}?fullText=true`);
    if (!response.ok) {
      if (response.status === 404) {
        showError('País no encontrado');
        return;
      }
      throw new Error('Error en la respuesta de la API');
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      showError('País no encontrado');
      return;
    }

    const country = data[0];
    const nameCommon = country.name?.common || 'Sin nombre';
    const capital = Array.isArray(country.capital) ? country.capital[0] : 'Sin capital';
    const region = country.region || 'Sin región';
    const population = country.population ? country.population.toLocaleString('es-ES') : 'Sin dato';
    const flagUrl = country.flags?.png || country.flags?.svg || '';

    result.innerHTML = `
      <h2 class="country-name">${nameCommon}</h2>
      <div class="country-data">
        <p><strong>Capital:</strong> ${capital}</p>
        <p><strong>Región:</strong> ${region}</p>
        <p><strong>Población:</strong> ${population}</p>
      </div>
      ${flagUrl ? `<img class="country-flag" src="${flagUrl}" alt="Bandera de ${nameCommon}" />` : ''}
    `;
  } catch (error) {
    console.error(error);
    showError('Ocurrió un error al consultar la API');
  }
}

function showError(message) {
  result.innerHTML = `<p class="info error">${message}</p>`;
}
