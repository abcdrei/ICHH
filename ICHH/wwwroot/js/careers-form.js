//window.applyPhoneMask = (elementId) => {
//    const input = document.getElementById(elementId);
//    if (!input) return;

//    input.addEventListener('input', (e) => {
//        // Strip everything except numbers
//        let numbers = e.target.value.replace(/\D/g, '');
        
//        // Truncate to 10 digits
//        if (numbers.length > 10) numbers = numbers.substring(0, 10);

//        // Apply US Mask: (XXX) XXX-XXXX
//        let formatted = '';
//        if (numbers.length > 0) {
//            formatted = '(' + numbers.substring(0, 3);
//            if (numbers.length > 3) {
//                formatted += ') ' + numbers.substring(3, 6);
//            }
//            if (numbers.length > 6) {
//                formatted += '-' + numbers.substring(6, 10);
//            }
//        }
//        e.target.value = formatted;
        
//        // Manually trigger the Blazor binding update
//        input.dispatchEvent(new Event('change'));
//    });
//};