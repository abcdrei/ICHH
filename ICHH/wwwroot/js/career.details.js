document.addEventListener("DOMContentLoaded", () => {

	const jobs = window.jobs;

	/* =====================================================
		 GET JOB ID FROM URL
	===================================================== */

	const params = new URLSearchParams(window.location.search);
	const id = params.get("id");

	const job = jobs.find(j => j.id == id);


	/* =====================================================
		 RENDER JOB
	===================================================== */

	if (job) {

		document.getElementById("jobTitle").innerHTML = `
      ${job.title}
    `;

		document.getElementById("jobFacility").innerHTML = `
      ${job.facility}
    `;

		document.getElementById("jobBadges").innerHTML = `
      <div class="badge rounded-pill pt-5px pb-5px ps-10px pe-10px fs-14px border border-2 border-color-dark-gray text-dark-gray">${job.payrate}</div>
      <div class="badge rounded-pill pt-5px pb-5px ps-10px pe-10px fs-14px border border-2 border-color-dark-gray text-dark-gray">${job.county} - ${job.city}</div>
      <div class="badge rounded-pill pt-5px pb-5px ps-10px pe-10px fs-14px border border-2 border-color-dark-gray text-dark-gray">${job.shift}</div>
      <div class="badge rounded-pill pt-5px pb-5px ps-10px pe-10px fs-14px border border-2 border-color-dark-gray text-dark-gray">${job.status}</div>
    `;

		document.getElementById("jobDescription").innerHTML = `
      <p class="text-dark-gray fw-500 fs-20px lh-28px mb-30px">${job.excerpt}</p>
      <div class="text-dark-gray">${job.description}</div>
    `;

		// Set Apply button link
		document.getElementById("applyButton").href = `career-form?id=${job.id}`;

	}
	else {
		document.body.innerHTML = `
      <div class="container text-center">
        <h3>Job not found</h3>
        <a href="/careers" class="btn btn-primary mt-3">
          Back to Jobs
        </a>
      </div>
    `;
	}

});
