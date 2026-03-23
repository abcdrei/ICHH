document.addEventListener("DOMContentLoaded", () => {

  const jobs = window.jobs;
  const mapping = window.COUNTY_CITY_MAPPING;

  /* =====================================================
     PAGINATION STATE
  ===================================================== */

  let currentPage = 1;
  const itemsPerPage = 9;
  let filteredJobs = [...jobs];

  /* =====================================================
     RENDER JOBS
  ===================================================== */

  const jobList  = document.getElementById("jobList");
  const jobCount = document.getElementById("jobCount");

  function renderJobs(data) {
    filteredJobs = data;
    const totalPages = Math.ceil(data.length / itemsPerPage);
    
    // Reset to page 1 if current page exceeds total pages
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = 1;
    }

    // Calculate slice indices
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageJobs = data.slice(startIndex, endIndex);

    jobList.innerHTML = "";

    if (!data.length) {
      jobList.innerHTML = `
        <div class="text-center text-dark-gray py-5">No jobs found.</div>
      `;
    }

      pageJobs.forEach(job => {
          jobList.insertAdjacentHTML("beforeend", `
				<div class="job-item border-radius-15px">
					<div class="d-flex flex-row justify-content-between align-items-center">
						<h3 class="jobTitle mb-5px text-dark-gray">${job.title}</h3>
						<div class="fw-600">#${job.id}</div>
					</div>
					<div class="fw-500 jobFacility d-none">${job.facility}</div>
					<hr className="divider-dotted" />
					<div class="d-flex flex-wrap gap-2 mb-20px">
						<div class="badge rounded-pill pt-5px pb-5px ps-10px pe-10px fs-14px border border-2 border-color-dark-gray text-dark-gray">${job.payrate}</div>
						<div class="badge rounded-pill pt-5px pb-5px ps-10px pe-10px fs-14px border border-2 border-color-dark-gray text-dark-gray">${job.county} - ${job.city}</div>
						<div class="badge rounded-pill pt-5px pb-5px ps-10px pe-10px fs-14px border border-2 border-color-dark-gray text-dark-gray">${job.shift}</div>
						<div class="badge rounded-pill pt-5px pb-5px ps-10px pe-10px fs-14px border border-2 border-color-dark-gray text-dark-gray">${job.status}</div>
					</div>
					<div class="jobDetails mb-30px">${job.excerpt}</div>

					<a href="/career-details?id=${job.id}" class="btn btn-dark-gray d-table rounded-pill fw-700 text-capitalize fs-14px w-100 mt-auto">
						View Job
					</a>
				</div>
      `);
    });

    jobCount.textContent = `(${data.length})`;
    renderPagination(data.length);
  }

  /* =====================================================
     PAGINATION CONTROLS
  ===================================================== */

  function renderPagination(totalItems) {
    const paginationContainer = document.getElementById("paginationControls");
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) {
      paginationContainer.innerHTML = "";
      return;
    }

    let paginationHTML = '<div class="d-flex justify-content-center align-items-center gap-2 flex-wrap">';

    // Previous button
    paginationHTML += `
      <button class="btn btn-sm ${currentPage === 1 ? 'btn-light disabled' : 'btn-dark-gray'} rounded-pill px-3 py-2" 
              onclick="changePage(${currentPage - 1})" 
              ${currentPage === 1 ? 'disabled' : ''}>
        <i class="fa-solid fa-chevron-left"></i> Previous
      </button>
    `;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      paginationHTML += `<button class="btn btn-sm btn-dark-gray rounded-pill px-3 py-2" onclick="changePage(1)">1</button>`;
      if (startPage > 2) {
        paginationHTML += '<span class="px-2">...</span>';
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
        <button class="btn btn-sm ${i === currentPage ? 'btn-dark-gray' : 'btn-outline-dark'} rounded-pill px-3 py-2" 
                onclick="changePage(${i})">
          ${i}
        </button>
      `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationHTML += '<span class="px-2">...</span>';
      }
      paginationHTML += `<button class="btn btn-sm btn-dark-gray rounded-pill px-3 py-2" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }

    // Next button
    paginationHTML += `
      <button class="btn btn-sm ${currentPage === totalPages ? 'btn-light disabled' : 'btn-dark-gray'} rounded-pill px-3 py-2" 
              onclick="changePage(${currentPage + 1})" 
              ${currentPage === totalPages ? 'disabled' : ''}>
        Next <i class="fa-solid fa-chevron-right"></i>
      </button>
    `;

    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;
  }

  // Global function for pagination buttons
  window.changePage = function(page) {
    const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
      renderJobs(filteredJobs);
      // Scroll to top of job list
      document.getElementById("jobList").scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }


  /* =====================================================
     FILTERING
  ===================================================== */

  function applyFilters() {

    const filters = {
      position: positionSelect.getValue(),
      county: countySelect.getValue(),
      city: citySelect.getValue(),
      shift: shiftSelect.getValue(),
      status: statusSelect.getValue(),
    };

    const filtered = jobs.filter(job => (

      (!filters.position.length || filters.position.includes(job.position)) &&
      (!filters.county.length || filters.county.includes(job.county)) &&
      (!filters.city.length || filters.city.includes(job.city)) &&
      (!filters.shift.length || filters.shift.includes(job.shift)) &&
      (!filters.status || filters.status === job.status)

    ));

    renderJobs(filtered);
  }


  /* =====================================================
     TOM SELECT INIT
  ===================================================== */

  function initCheckboxSelect(selector, placeholder) {

    const select = new TomSelect(selector, {
      plugins: ['checkbox_options','remove_button'],
      placeholder,
      hidePlaceholder: true,
      closeAfterSelect: false,
    });

    select.on("change", applyFilters);

    return select;
  }

  const positionSelect = initCheckboxSelect(
    "#filter-position",
    "Select position"
  );

  const countySelect = initCheckboxSelect(
    "#filter-county",
    "Select county"
  );

	const citySelect = new TomSelect("#filter-city", {
      plugins: ['checkbox_options','remove_button'],
      placeholder: "Select city",
      hidePlaceholder: true,
      closeAfterSelect: false,
      valueField: 'value',
      labelField: 'text',
      searchField: 'text',
      options: [], // Start empty
      create: false
  });

  citySelect.on("change", applyFilters);
  citySelect.disable(); // Initially disabled

  const shiftSelect = initCheckboxSelect(
    "#filter-shift",
    "Select shift"
  );

  const statusSelect = new TomSelect("#filter-status", {
    allowEmptyOption: true,
    items: [""] // Default = All
  });

  statusSelect.on("change", applyFilters);


  /* =====================================================
     CASCADE LOGIC (County -> City)
  ===================================================== */

  countySelect.on("change", function(value) {
    // value is an array of selected county strings (e.g. ["Dallas", "Collin"])
    
    citySelect.clear();
    citySelect.clearOptions();

    if (!value || value.length === 0) {
      citySelect.disable();
    } else {
      citySelect.enable();
      
      let validCities = [];
      
      value.forEach(countyName => {
        if (mapping[countyName]) {
          validCities = validCities.concat(mapping[countyName]);
        }
      });

      // Remove duplicates and sort
      validCities = [...new Set(validCities)].sort();

      // Add options to citySelect
      validCities.forEach(city => {
        citySelect.addOption({ value: city, text: city });
      });
    }
  });


  /* =====================================================
     CLEAR FILTERS
  ===================================================== */

  document.getElementById("clearFilters")
    .addEventListener("click", () => {

      positionSelect.clear();
      countySelect.clear();
      citySelect.clear();
      shiftSelect.clear();
      statusSelect.setValue("");

      // Explicitly disable city select on clear
      citySelect.clearOptions();
      citySelect.disable();

      renderJobs(jobs);
    });


  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  renderJobs(jobs);

});
