import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBfu8atBkW0-37cbRsU89LN-91wZ4NLBQo",
    authDomain: "lead-visualizer.firebaseapp.com",
    projectId: "lead-visualizer",
    storageBucket: "lead-visualizer.firebasestorage.app",
    messagingSenderId: "384101381800",
    appId: "1:384101381800:web:f5a66f5a14202da007f49d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const leadCollection = collection(db, "lead");

const btnVerLeads = document.getElementById('btn-ver-leads');
const btnAgregarLead = document.getElementById('btn-agregar-lead');
const sectionVisualizador = document.getElementById('section-visualizador');
const sectionFormulario = document.getElementById('section-formulario');
const leadForm = document.getElementById('lead-form');
const leadsGrid = document.getElementById('leads-grid');
const searchBar = document.getElementById('search-bar');

let localLeadsMemory = [];

// --- NAVEGACIÓN ---
btnVerLeads.addEventListener('click', () => {
    switchSection(sectionVisualizador, btnVerLeads);
    fetchLeadsFromCloud(); 
});

btnAgregarLead.addEventListener('click', () => {
    switchSection(sectionFormulario, btnAgregarLead);
});

function switchSection(targetSection, activeBtn) {
    sectionVisualizador.classList.add('hidden');
    sectionFormulario.classList.add('hidden');
    btnVerLeads.classList.remove('active');
    btnAgregarLead.classList.remove('active');
    targetSection.classList.remove('hidden');
    activeBtn.classList.add('active');
}

// --- LEER DE LA NUBE ---
async function fetchLeadsFromCloud() {
    try {
        const q = query(leadCollection, orderBy("createdat", "desc"));
        const querySnapshot = await getDocs(q);
        
        localLeadsMemory = [];
        querySnapshot.forEach((doc) => {
            localLeadsMemory.push({ id: doc.id, ...doc.data() });
        });

        renderLeads(localLeadsMemory);
    } catch (error) {
        console.error("Error: ", error);
        leadsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: red;">Error al cargar datos de Firestore.</p>`;
    }
}

// --- RENDERIZAR TARJETAS ---
function renderLeads(leadsToRender) {
    leadsGrid.innerHTML = '';

    if (leadsToRender.length === 0) {
        leadsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No hay registros.</p>`;
        return;
    }

    leadsToRender.forEach(lead => {
        const card = document.createElement('div');
        card.classList.add('lead-card');
        
        // Convertir espacios del estado en guiones para la clase CSS (ej: "proyecto en curso" -> "proyecto-en-curso")
        const statusClass = lead.status.replace(/\s+/g, '-');

        card.innerHTML = `
            <div>
                <div class="card-top">
                    <span class="lead-tag">${lead.type}</span>
                    <span class="status-badge status-${statusClass}">${lead.status}</span>
                </div>
                <h3>${lead.name}</h3>
                <div class="rating-box">⭐ ${lead.rating} <span>(${lead.reviews} reseñas)</span></div>
                <div class="lead-info">
                    <p>📍 <strong>${lead.location}</strong></p>
                    <p>🏠 <small>${lead.address}</small></p>
                    ${lead.phone ? `<p>📞 ${lead.phone}</p>` : ''}
                    ${lead.email ? `<p>✉️ ${lead.email}</p>` : ''}
                </div>
            </div>
            
            <div>
                <div class="status-selector-container">
                    <label>Actualizar Estado:</label>
                    <select class="card-status-select" data-id="${lead.id}">
                        <option value="sin contactar" ${lead.status === 'sin contactar' ? 'selected' : ''}>Sin Contactar</option>
                        <option value="contactado" ${lead.status === 'contactado' ? 'selected' : ''}>Contactado</option>
                        <option value="oferta rechazada" ${lead.status === 'oferta rechazada' ? 'selected' : ''}>Oferta Rechazada</option>
                        <option value="proyecto en curso" ${lead.status === 'proyecto en curso' ? 'selected' : ''}>Proyecto en Curso</option>
                        <option value="proyecto finalizado" ${lead.status === 'proyecto finalizado' ? 'selected' : ''}>Proyecto Finalizado</option>
                        <option value="cliente activo" ${lead.status === 'cliente activo' ? 'selected' : ''}>Cliente Activo</option>
                    </select>
                </div>
                <div class="lead-actions">
                    <a href="${lead.maps}" target="_blank" class="btn-maps">Ver en Maps</a>
                </div>
            </div>
        `;
        leadsGrid.appendChild(card);
    });

    // Vincular eventos a los selectores de cambio de estado de cada tarjeta
    document.querySelectorAll('.card-status-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const leadId = e.target.getAttribute('data-id');
            const newStatus = e.target.value;
            await updateLeadStatus(leadId, newStatus);
        });
    });
}

// --- ACTUALIZAR ESTADO EN EN TIEMPO REAL ---
async function updateLeadStatus(id, newStatus) {
    try {
        const leadRef = doc(db, "lead", id);
        await updateDoc(leadRef, {
            status: newStatus
        });
        
        // Actualizar memoria local sin recargar de la nube por rendimiento
        const leadIndex = localLeadsMemory.findIndex(l => l.id === id);
        if(leadIndex !== -1) {
            localLeadsMemory[leadIndex].status = newStatus;
        }
        renderLeads(localLeadsMemory); // Volver a pintar para refrescar los badges de color
    } catch (error) {
        alert("Error al actualizar estado: " + error.message);
    }
}

// --- GUARDAR NUEVO LEAD ---
leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSave = document.getElementById('btn-save');
    btnSave.innerText = "Guardando...";
    btnSave.disabled = true;

    const newLead = {
        name: document.getElementById('lead-name').value,
        type: document.getElementById('lead-type').value,
        status: document.getElementById('lead-status').value,
        rating: parseFloat(document.getElementById('lead-rating').value),
        reviews: parseInt(document.getElementById('lead-reviews').value, 10),
        address: document.getElementById('lead-address').value,
        location: document.getElementById('lead-location').value,
        maps: document.getElementById('lead-maps').value,
        phone: document.getElementById('lead-phone').value || null,
        email: document.getElementById('lead-email').value || null,
        createdat: Date.now() 
    };

    try {
        await addDoc(leadCollection, newLead);
        leadForm.reset();
        btnVerLeads.click();
    } catch (error) {
        alert("Error al guardar: " + error.message);
    } finally {
        btnSave.innerText = "Guardar Cliente en la Nube";
        btnSave.disabled = false;
    }
});

// --- FILTRO DE BÚSQUEDA AVANZADA ---
searchBar.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredLeads = localLeadsMemory.filter(lead => 
        lead.name.toLowerCase().includes(searchTerm) || 
        lead.type.toLowerCase().includes(searchTerm) ||
        lead.location.toLowerCase().includes(searchTerm) ||
        lead.status.toLowerCase().includes(searchTerm)
    );
    renderLeads(filteredLeads);
});

fetchLeadsFromCloud();