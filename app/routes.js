var querystring = require('querystring');
var findIndex = require('array.prototype.findindex');
findIndex.shim();

module.exports = {
  bind : function (app) {
    function find_gp_practice(slug) {
      return app.locals.gp_practices.filter(
        function(p) {
          return p.slug === slug;
        }
      )[0];
    }

    function find_appointment(uuid) {
      return app.locals.appointments.filter(
        function(a) {
          return a.uuid === uuid;
        }
      )[0];
    }

    function find_matching_appointments(filter_functions) {
      return filter_functions.reduce(function(filtered_appointments, filter_func) {
        return filtered_appointments.filter(filter_func);
      }, app.locals.appointments);
    }

    function find_matching_appointment(filter_functions) {
      return find_matching_appointments(filter_functions)[0]
    }

    function getServiceFromSlug(service_slug_param) {
      var service_slug = service_slug_param || 'general-practice',
          service = app.locals.services.filter(function(service) {
            return service.slug === service_slug;
          })[0];

      return service;
    }

    function getPractitionerFromUuid(uuid) {
      return app.locals.practitioners.filter(function(practitioner) {
        return practitioner.uuid === uuid;
      })[0];
    };

    function findPractitionersForService(service_slug) {
      var service_to_uuid = {};  // {'eye-check': [practitioner_uuid_1, practitioner_uuid_2]}

      app.locals.appointments.forEach(function(appointment) {
        if(!service_to_uuid.hasOwnProperty(appointment.service)) {
          service_to_uuid[appointment.service] = [];
        }

        if(-1 == service_to_uuid[appointment.service].indexOf(appointment.practitioner_uuid)) {
          service_to_uuid[appointment.service].push(appointment.practitioner_uuid);
        }
      });

      return service_to_uuid[service_slug].map(getPractitionerFromUuid);
    }

    app.get('/', function (req, res) {
		
		// hitting main page resets all items back into rejected

		while(pendingItemsJson.length>0)
			rejectedItemsJson.push(pendingItemsJson.pop());
		
      res.render('index');
    });

    app.get('/examples/template-data', function (req, res) {
      res.render('examples/template-data', { 'name' : 'Foo' });
    });

    app.get('/diabetes-content*', function (req, res) {
      res.redirect('/type-2-diabetes' + req.params[0]);
    });

    // add your routes here
      
      
    //DPR
      app.get('/dsr/index', function (req, res) {
      res.render('dsr/index');
    });
      
      
    // Change or cancel appointment fork:
    app.get('/change-or-cancel-an-appointment/path-handler', function(req, res) {
      console.log(req.query);
      if (req.query.appointment === 'change') {
        res.redirect('/change-or-cancel-an-appointment/change-to-next-available-appointment');
      } else {
        res.redirect('/change-or-cancel-an-appointment/cancel-appointment');
      }
    });

    // Register with a GP - suggested GP practices
    app.get('/register-with-a-gp/suggested-gps', function(req, res) {
      res.render(
        'register-with-a-gp/suggested-gps',
        { practices: app.locals.gp_practices }
      );
    });

    // Register with a GP - practice details
    app.get('/register-with-a-gp/practices/:practice', function(req, res) {
      var practice = find_gp_practice(req.params.practice);

      res.render('register-with-a-gp/practice-details',
                 {'practice': practice});
    });

    // Register with a GP - choose a practice to register with
    app.get('/register-with-a-gp/practices/:practice/register', function(req, res) {
      var practice = find_gp_practice(req.params.practice);

      req.session.practice = {
        name: practice.name,
        address: practice.address.join(', ')
      };

      res.redirect('/register-with-a-gp/choose-registration-method');
    });

    // Register with a GP - choose register method fork:
    app.get('/register-with-a-gp/choose-registration-method-handler', function(req, res) {
      if (req.query.registration_method === 'with-signin') {
        res.redirect('/register-with-a-gp/register-with-signin');
      } else {
        res.redirect('/register-with-a-gp/register-without-signin');
      }
    });

    app.get('/register-with-a-gp/application-complete', function(req, res) {
      res.render(
        'register-with-a-gp/application-complete',
        {
          hideDonorQuestions: req.query.hideDonorQuestions
        }
      )
    });

    app.get('/book-an-appointment/:service_slug?/see-particular-person', function(req, res) {
      var service = getServiceFromSlug(req.params.service_slug),
          practitioners = findPractitionersForService(service.slug);

      res.render(
        'book-an-appointment/see-particular-person',
        {
          practice: app.locals.gp_practices[0],
          practitioners: practitioners
        }
      );
    });

    app.get('/book-an-appointment/:service_slug?/appointments-with-practitioner', function(req, res) {
      var practitioner_uuid = req.query.practitioner,
          service = getServiceFromSlug(req.params.service_slug),
          practitioner = getPractitionerFromUuid(practitioner_uuid);

      res.render(
        'book-an-appointment/appointments-with-practitioner',
        {
          practice: app.locals.gp_practices[0],
          practitioner: practitioner,
          appointments: find_matching_appointments([
            filterByPractitionerUuid(practitioner_uuid),
            filterByService(service.slug)])
        }
      );
    });

    app.get('/book-an-appointment/:service_slug?/next-appointment-early-morning', function(req, res) {
      var service = getServiceFromSlug(req.params.service_slug),
          practice = service.slug === 'general-practice' ? app.locals.gp_practices[0] : null;

      res.render(
        'book-an-appointment/next-appointment-early-morning',
        {
          practice: practice,
          service: service,
          appointments: {
            face_to_face: find_matching_appointment([filterByService(service.slug),filterFaceToFace]),
            early: find_matching_appointment([filterByService(service.slug),filterBefore10]),
          }
        }
      );
    });

    app.get('/book-an-appointment/next-appointment-with-woman', function(req, res) {
      res.render(
        'book-an-appointment/next-appointment-with-woman',
        {
          practice: app.locals.gp_practices[0],
          appointments: {
            face_to_face: find_matching_appointment([filterByService('general-practice'),filterFaceToFace]),
            female_gp: find_matching_appointment([filterByService('general-practice'),filterFemaleGP])
          }
        }
      );
    });

    app.get('/book-an-appointment/next-appointment-with-woman-early-morning', function(req, res) {
      res.render(
        'book-an-appointment/next-appointment-with-woman-early-morning',
        {
          practice: app.locals.gp_practices[0],
          appointments: {
            face_to_face: find_matching_appointment([filterByService('general-practice'),filterFaceToFace]),
            female_gp: find_matching_appointment([filterByService('general-practice'),filterFemaleGP]),
            early_female_gp: find_matching_appointment([filterByService('general-practice'),filterFemaleGP, filterBefore10])
          }
        }
      );
    });

    app.get('/book-an-appointment/:service_slug?/find-new-appointment', function(req, res) {
      var service_slug = req.params.service_slug,
          offramp = req.session.service_booking_offramp &&
                    req.session.service_booking_offramp[service_slug];

      if (offramp) {
        delete req.session.service_booking_offramp[service_slug];
      }

      res.render('book-an-appointment/find-new-appointment');
    });

    app.get('/book-an-appointment/:service_slug?/next-available-appointment', function(req, res) {

      var service = getServiceFromSlug(req.params.service_slug),
          practice = service.slug === 'general-practice' ? app.locals.gp_practices[0] : null;

      res.render(
        'book-an-appointment/next-available-appointment',
        {
          practice: practice,
          service: service,
          appointments: {
            face_to_face: find_matching_appointment([filterByService(service.slug),filterFaceToFace]),
          }
        }
      );
    });

    app.get('/book-an-appointment/:service_slug?/all-appointments', function(req, res) {

      var service = getServiceFromSlug(req.params.service_slug),
          practice = service.slug === 'general-practice' ? app.locals.gp_practices[0] : null;

      res.render(
        'book-an-appointment/all-appointments',
        {
          practice: practice,
          appointments: find_matching_appointments([filterByService(service.slug)]),
        }
      );
    });

    app.get('/book-an-appointment/:service_slug?/confirm-appointment/:uuid', function(req, res) {
      var appointment = find_appointment(req.params.uuid),
          service = getServiceFromSlug(req.params.service_slug),
          practice = app.locals.gp_practices[0],
          address = appointment.address || [practice.name].concat(practice.address);

      res.render(
        'book-an-appointment/confirm-appointment',
        {
          practice: practice,
          service: service,
          appointment: appointment,
          address: address
        }
      );
    });

    app.get('/book-an-appointment/:service_slug?/appointment-confirmed/:uuid', function(req, res) {
      var service = getServiceFromSlug(req.params.service_slug),
          offramp = req.session.service_booking_offramp &&
                    req.session.service_booking_offramp[service.slug];

      if (offramp) {
        delete req.session.service_booking_offramp[service.slug];
        res.redirect(offramp.replace('UUID', req.params.uuid));
      }
      else {
        res.render(
          'book-an-appointment/appointment-confirmed',
          {
            practice: app.locals.gp_practices[0],
            service: service,
            appointment: find_appointment(req.params.uuid)
          }
        );
      }
    });

    app.get(/^\/(book-an-appointment\/[^.]+)$/, function (req, res) {
      var path = (req.params[0]);

      res.render(
        path,
        {
          practice: app.locals.gp_practices[0]
        },
        function(err, html) {
          if (err) {
            console.log(err);
            res.send(404);
          } else {
            res.end(html);
          }
        }
      );
    });

    app.get('/planner/main', function(req, res) {
      var booked_eye_test = req.query.booked_eye_test &&
                            find_appointment(req.query.booked_eye_test),
          booked_diabetes_review = req.query.booked_diabetes_review &&
                                   find_appointment(req.query.booked_diabetes_review),
          booked_blood_test = req.query.booked_blood_test &&
                              find_appointment(req.query.booked_blood_test),
          cards = {
            past: [],
            present: [],
            future: []
          };

      // historic stuff
      cards.past.push('test-results');
      cards.past.push('medication');

      // actions to take
      if (!booked_blood_test) {
        cards.present.push('book-your-blood-test');
      }
      if (!booked_diabetes_review) {
        cards.present.push('book-your-first-diabetes-review');
      }
      if (!booked_eye_test) {
        cards.present.push('book-your-first-eye-test');
      }

      // upcoming stuff
      cards.future.push('repeat-prescription');
      if (booked_eye_test) {
        cards.future.push('your-eye-test-appointment');
      }
      if (booked_blood_test) {
        cards.future.push('your-blood-test-appointment');
      }
      if (booked_diabetes_review) {
        cards.future.push('your-diabetes-review-appointment');
      }

      res.render(
        'planner/main',
        {
          cards: cards,
          booked_eye_test: booked_eye_test,
          booked_diabetes_review: booked_diabetes_review,
          booked_blood_test: booked_blood_test,
          querystring: querystring.stringify(req.query)
        }
      );
    });

    app.get('/planner/book-diabetes-review', function(req, res) {
      var query = req.query,
          service_slug = 'diabetes-annual-review';

      // work out a return URL
      query.booked_diabetes_review = 'UUID';
      var return_url = '/planner/main?' + querystring.stringify(query)
          + '#your-diabetes-review-appointment';

      // set the return URL in the session
      if (!req.session.service_booking_offramp) {
        req.session.service_booking_offramp = {};
      }
      req.session.service_booking_offramp[service_slug] = return_url;

      // redirect to the service booking journey, skipping log in
      res.redirect(
        '/book-an-appointment/' + service_slug + '/next-available-appointment'
      );
    });

    app.get('/planner/book-eye-test', function(req, res) {
      var query = req.query,
          service_slug = 'diabetes-eye-screening';

      // work out a return URL
      query.booked_eye_test = 'UUID';
      var return_url = '/planner/main?' + querystring.stringify(query)
          + '#your-eye-test-appointment';

      // set the return URL in the session
      if (!req.session.service_booking_offramp) {
        req.session.service_booking_offramp = {};
      }
      req.session.service_booking_offramp[service_slug] = return_url;

      // redirect to the service booking journey, skipping log in
      res.redirect(
        '/book-an-appointment/' + service_slug + '/next-available-appointment'
      );
    });

    app.get('/planner/book-blood-test', function(req, res) {
      var query = req.query,
          service_slug = 'diabetes-blood-glucose-test';

      // work out a return URL
      query.booked_blood_test = 'UUID';
      var return_url = '/planner/main?' + querystring.stringify(query)
          + '#your-blood-test-appointment';

      // set the return URL in the session
      if (!req.session.service_booking_offramp) {
        req.session.service_booking_offramp = {};
      }
      req.session.service_booking_offramp[service_slug] = return_url;

      // redirect to the service booking journey, skipping log in
      res.redirect(
        '/book-an-appointment/' + service_slug + '/next-available-appointment'
      );
    });

	//////////////////////////
	/// sprint 4

	
	var rejectedItemsJson=[
		{"id" : "item1", "productName" : "Carmellose",     "presentation" : "Tablets", "strength" : "150mg", "qty" : "28", "patientName" : "Hadworth", "patientDob" : "10/11/1981", "patientNhsNum" : "6583257485"},
		{"id" : "item2", "productName" : "Ranitidine",      "presentation" : "Suspension", "strength" : "200mg", "qty" : "12", "patientName" : "Harding", "patientDob" : "05/09/1976", "patientNhsNum" : "658732165"},
		{"id" : "item3", "productName" : "Colecalciferol",  "presentation" : "Capsules", "strength" : "20,000u", "qty" : "56", "patientName" : "Smith", "patientDob" : "01/03/1955", "patientNhsNum" : "2589637621"},
		{"id" : "item4", "productName" : "Doxazosin",       "presentation" : "Tablets", "strength" : "4mg M/R", "qty" : "14", "patientName" : "Sherdian", "patientDob" : "14/02/2009", "patientNhsNum" : "1258963241"},
		{"id" : "item5", "productName" : "Co-amoxiclav",    "presentation" : "Oral suspension sugar free", "strength" : "125mg/31mg/5ml", "qty" : "100ml", "patientName" : "Morra", "patientDob" : "18/04/2004", "patientNhsNum" : "148365255"},
		{"id" : "item6", "productName" : "Nifedipress",     "presentation" : "Tablets", "strength" : "10mg M/R", "qty" : "7", "patientName" : "Eddington", "patientDob" : "20/06/1966", "patientNhsNum" : "125681254"}
	];

	var pendingItemsJson=[

	];

	app.get('/dsr/sprint4_a/login/dashboard', function(req, res) {
		
		res.render('dsr/sprint4_a/login/dashboard',
        {
			"totalUnpaidItemsCount" : pendingItemsJson.length + rejectedItemsJson.length,
			"rejectedItemsCount" : rejectedItemsJson.length,
			"pendingItemsCount" : pendingItemsJson.length
        }
      );
	});

	app.get('/dsr/sprint4_a/login/dashboard/rejected', function(req, res) {
		
		res.render('dsr/sprint4_a/login/dashboard/rejected',
        {
			"rejectedItems" : rejectedItemsJson,
			"pendingItems" : pendingItemsJson,
			"rejectedItemsCount" : rejectedItemsJson.length,
			"pendingItemsCount" : pendingItemsJson.length
        }
      );
	});

	// show the selected item
	app.get('/dsr/sprint4_a/login/dashboard/items/cycle/rejected/next', function(req, res) {
	
		if(rejectedItemsJson.length>0)
		{
			// get first rejected item
			var firstItemId=rejectedItemsJson[0].id;
			// show it
			res.redirect('/dsr/sprint4_a/login/dashboard/items/cycle/rejected/'+firstItemId+'?after=NEXT');		
		}
		else
		{
			// no rejected items. go to dashboard page
			res.redirect('/dsr/sprint4_a/login/dashboard/');		
		}
	
	});
	
	// show the selected item
	app.get('/dsr/sprint4_a/login/dashboard/items/cycle/rejected/:itemId', function(req, res) {
		
		var selectedItemId = req.params.itemId;
		var item;
		
		var indexInRejected=rejectedItemsJson.findIndex(function(elementInArray){
			return elementInArray.id==selectedItemId;
		}
		);

		var indexInPending=pendingItemsJson.findIndex(function(elementInArray){
			return elementInArray.id==selectedItemId;
		}
		);		
		
		// the entry is in either rejectedItemsJson or pendingItemsJson
		if(indexInRejected!=-1)
			item=rejectedItemsJson[indexInRejected];
		else if(indexInPending!=-1)
			item=pendingItemsJson[indexInPending];
			
		res.render('dsr/sprint4_a/login/dashboard/items/cycle/template',
        {
			"selectedItemId" : item.id,
			"selectedProductName" : item.productName,
			"selectedPresentation" : item.presentation,
			"selectedStrength" : item.strength,
			"selectedQty" : item.qty,
			"patientName" : item.patientName,
			"patientDob" : item.patientDob,
			"patientNhsNum" : item.patientNhsNum,
			"after" : req.query.after,
			"packSizeError" : req.query.packSizeError,
			"supplierError" : req.query.supplierError
        }
      );
	});
	
	// submit the selected item
	// url query param = "after". set to either NEXT or MAIN
	app.get('/dsr/sprint4_a/login/dashboard/items/cycle/submit/:itemId', function(req, res) {
		
		var selectedItemId = req.params.itemId;
		var supplierError=false;
		var packSizeError=false;
		
		if(req.query.supplierInput=="")
			supplierError=true;
		
		if(req.query.packSizeInput=="")
			packSizeError=true;

		var indexInRejected=rejectedItemsJson.findIndex(function(elementInArray){
			return elementInArray.id==selectedItemId;
		}
		);

		var indexInPending=pendingItemsJson.findIndex(function(elementInArray){
			return elementInArray.id==selectedItemId;
		}
		);
		
		if((supplierError==false || packSizeError==false)
			&& indexInRejected>=0 && indexInPending==-1)
		{
			var moveThisRow=rejectedItemsJson[indexInRejected];
			rejectedItemsJson.splice(indexInRejected, 1);
			pendingItemsJson.push(moveThisRow);
		}
		
		// either go to the next, or back to the main page
		// or re-display the current page if there's an error
		var whereAfter=req.query.after;
		if(supplierError==true || packSizeError==true)
			res.redirect('/dsr/sprint4_a/login/dashboard/items/cycle/rejected/'+selectedItemId+'?after='+whereAfter+'&supplierError='+supplierError+'&packSizeError='+packSizeError);
		else if(whereAfter=="MAIN")
			res.redirect('/dsr/sprint4_a/login/dashboard/rejected');
		else if(whereAfter=="NEXT")
			res.redirect('/dsr/sprint4_a/login/dashboard/items/cycle/rejected/next');
		else // this shouldn't happen(!). go to main page anyway
			res.redirect('/dsr/sprint4_a/login/dashboard/rejected');
		
	});
	
	//////////////////////////
	/// sprint 5

	app.get('/dsr/sprint5/login/dashboard', function(req, res) {
		
		res.render('dsr/sprint5/login/dashboard',
        {
			"totalUnpaidItemsCount" : pendingItemsJson.length + rejectedItemsJson.length,
			"rejectedItemsCount" : rejectedItemsJson.length,
			"pendingItemsCount" : pendingItemsJson.length
        }
      );
	});

	app.get('/dsr/sprint5/login/dashboard/rejected', function(req, res) {
		
		res.render('dsr/sprint5/login/dashboard/rejected',
        {
			"rejectedItems" : rejectedItemsJson,
			"pendingItems" : pendingItemsJson,
			"rejectedItemsCount" : rejectedItemsJson.length,
			"pendingItemsCount" : pendingItemsJson.length
        }
      );
	});

	// show the selected item
	app.get('/dsr/sprint5/login/dashboard/items/cycle/rejected/next', function(req, res) {
	
		if(rejectedItemsJson.length>0)
		{
			// get first rejected item
			var firstItemId=rejectedItemsJson[0].id;
			
			// unpaid item count - held at the figure when the user first clicked "Add Information"
			var startingUnpaidItemCount=req.query.startingUnpaidItemCount;
			// running total of items corrected in a run
			var unpaidItemRunning=parseInt(req.query.unpaidItemRunning)+1;
			
			// show it
			res.redirect('/dsr/sprint5/login/dashboard/items/cycle/rejected/'+firstItemId+'?after=NEXT&startingUnpaidItemCount='+startingUnpaidItemCount+'&unpaidItemRunning='+unpaidItemRunning);		
		}
		else
		{
			// no rejected items. go to dashboard page
			res.redirect('/dsr/sprint5/login/dashboard/');		
		}
	
	});
	
	// show the selected item
	app.get('/dsr/sprint5/login/dashboard/items/cycle/rejected/:itemId', function(req, res) {
		
		var selectedItemId = req.params.itemId;
		var item;
		
		var indexInRejected=rejectedItemsJson.findIndex(function(elementInArray){
			return elementInArray.id==selectedItemId;
		}
		);

		var indexInPending=pendingItemsJson.findIndex(function(elementInArray){
			return elementInArray.id==selectedItemId;
		}
		);		
		
		// the entry is in either rejectedItemsJson or pendingItemsJson
		if(indexInRejected!=-1)
			item=rejectedItemsJson[indexInRejected];
		else if(indexInPending!=-1)
			item=pendingItemsJson[indexInPending];
			
		res.render('dsr/sprint5/login/dashboard/items/cycle/template',
        {
			"selectedItemId" : item.id,
			"selectedProductName" : item.productName,
			"selectedPresentation" : item.presentation,
			"selectedStrength" : item.strength,
			"selectedQty" : item.qty,
			"patientName" : item.patientName,
			"patientDob" : item.patientDob,
			"patientNhsNum" : item.patientNhsNum,
			"after" : req.query.after,
			"packSizeError" : req.query.packSizeError,
			"supplierError" : req.query.supplierError,
			"startingUnpaidItemCount" : req.query.startingUnpaidItemCount,
			"unpaidItemRunning" : req.query.unpaidItemRunning
        }
      );
	});
	
	// submit the selected item
	// url query param = "after". set to either NEXT or MAIN
	app.get('/dsr/sprint5/login/dashboard/items/cycle/submit/:itemId', function(req, res) {
		
		var selectedItemId = req.params.itemId;
		var supplierError=false;
		var packSizeError=false;
		
		if(req.query.supplierInput=="")
			supplierError=true;
		
		if(req.query.packSizeInput=="")
			packSizeError=true;

		// unpaid item count - held at the figure when the user first clicked "Add Information"
		var startingUnpaidItemCount=req.query.startingUnpaidItemCount;
		// running total of items corrected in a run
		var unpaidItemRunning=parseInt(req.query.unpaidItemRunning);		
		
		var indexInRejected=rejectedItemsJson.findIndex(function(elementInArray){
			return elementInArray.id==selectedItemId;
		}
		);

		var indexInPending=pendingItemsJson.findIndex(function(elementInArray){
			return elementInArray.id==selectedItemId;
		}
		);
		
		if((supplierError==false || packSizeError==false)
			&& indexInRejected>=0 && indexInPending==-1)
		{
			var moveThisRow=rejectedItemsJson[indexInRejected];
			rejectedItemsJson.splice(indexInRejected, 1);
			pendingItemsJson.push(moveThisRow);
		}
		
		// either go to the next, or back to the main page
		// or re-display the current page if there's an error
		var whereAfter=req.query.after;
		if(supplierError==true || packSizeError==true)
			res.redirect('/dsr/sprint5/login/dashboard/items/cycle/rejected/'+selectedItemId+'?after='+whereAfter+'&supplierError='+supplierError+'&packSizeError='+packSizeError+'&startingUnpaidItemCount='+startingUnpaidItemCount+'&unpaidItemRunning='+unpaidItemRunning);
		else if(whereAfter=="MAIN")
			res.redirect('/dsr/sprint5/login/dashboard/rejected');
		else if(whereAfter=="NEXT")
			res.redirect('/dsr/sprint5/login/dashboard/items/cycle/rejected/next?startingUnpaidItemCount='+startingUnpaidItemCount+'&unpaidItemRunning='+unpaidItemRunning);
		else // this shouldn't happen(!). go to main page anyway
			res.redirect('/dsr/sprint5/login/dashboard/rejected');
		
	});	
      
      //////////////////////////
	/// sprint 6

	app.get('/dsr/sprint6/login/dashboard', function(req, res) {
		
		res.render('dsr/sprint6/login/dashboard',
        {
			"totalUnpaidItemsCount" : pendingItemsJson.length + rejectedItemsJson.length,
			"rejectedItemsCount" : rejectedItemsJson.length,
			"pendingItemsCount" : pendingItemsJson.length
        }
      );
	});

	app.get('/dsr/sprint6/login/dashboard/rejected', function(req, res) {
		
		res.render('dsr/sprint6/login/dashboard/rejected',
        {
			"rejectedItems" : rejectedItemsJson,
			"pendingItems" : pendingItemsJson,
			"rejectedItemsCount" : rejectedItemsJson.length,
			"pendingItemsCount" : pendingItemsJson.length
        }
      );
	});

	// show the selected item
	app.get('/dsr/sprint6/login/dashboard/items/cycle/rejected/next', function(req, res) {
	
		if(rejectedItemsJson.length>0)
		{
			// get first rejected item
			var firstItemId=rejectedItemsJson[0].id;
			
			// unpaid item count - held at the figure when the user first clicked "Add Information"
			var startingUnpaidItemCount=req.query.startingUnpaidItemCount;
			// running total of items corrected in a run
			var unpaidItemRunning=parseInt(req.query.unpaidItemRunning)+1;
			
			// show it
			res.redirect('/dsr/sprint6/login/dashboard/items/cycle/rejected/'+firstItemId+'?after=NEXT&startingUnpaidItemCount='+startingUnpaidItemCount+'&unpaidItemRunning='+unpaidItemRunning);		
		}
		else
		{
			// no rejected items. go to dashboard page
			res.redirect('/dsr/sprint6/login/dashboard/');		
		}
	
	});
	
	// show the selected item
	app.get('/dsr/sprint6/login/dashboard/items/cycle/rejected/:itemId', function(req, res) {
		
		var selectedItemId = req.params.itemId;
		var item;
		
		var indexInRejected=rejectedItemsJson.findIndex(function(elementInArray){
			return elementInArray.id==selectedItemId;
		}
		);

		var indexInPending=pendingItemsJson.findIndex(function(elementInArray){
			return elementInArray.id==selectedItemId;
		}
		);		
		
		// the entry is in either rejectedItemsJson or pendingItemsJson
		if(indexInRejected!=-1)
			item=rejectedItemsJson[indexInRejected];
		else if(indexInPending!=-1)
			item=pendingItemsJson[indexInPending];
			
		res.render('dsr/sprint6/login/dashboard/items/cycle/template',
        {
			"selectedItemId" : item.id,
			"selectedProductName" : item.productName,
			"selectedPresentation" : item.presentation,
			"selectedStrength" : item.strength,
			"selectedQty" : item.qty,
			"patientName" : item.patientName,
			"patientDob" : item.patientDob,
			"patientNhsNum" : item.patientNhsNum,
			"after" : req.query.after,
			"packSizeError" : req.query.packSizeError,
			"supplierError" : req.query.supplierError,
			"startingUnpaidItemCount" : req.query.startingUnpaidItemCount,
			"unpaidItemRunning" : req.query.unpaidItemRunning
        }
      );
	});
	
	// submit the selected item
	// url query param = "after". set to either NEXT or MAIN
	app.get('/dsr/sprint6/login/dashboard/items/cycle/submit/:itemId', function(req, res) {
		
		var selectedItemId = req.params.itemId;
		var supplierError=false;
		var packSizeError=false;
		
		if(req.query.supplierInput=="")
			supplierError=true;
		
		if(req.query.packSizeInput=="")
			packSizeError=true;

		// unpaid item count - held at the figure when the user first clicked "Add Information"
		var startingUnpaidItemCount=req.query.startingUnpaidItemCount;
		// running total of items corrected in a run
		var unpaidItemRunning=parseInt(req.query.unpaidItemRunning);		
		
		var indexInRejected=rejectedItemsJson.findIndex(function(elementInArray){
			return elementInArray.id==selectedItemId;
		}
		);

		var indexInPending=pendingItemsJson.findIndex(function(elementInArray){
			return elementInArray.id==selectedItemId;
		}
		);
		
		if((supplierError==false || packSizeError==false)
			&& indexInRejected>=0 && indexInPending==-1)
		{
			var moveThisRow=rejectedItemsJson[indexInRejected];
			rejectedItemsJson.splice(indexInRejected, 1);
			pendingItemsJson.push(moveThisRow);
		}
		
		// either go to the next, or back to the main page
		// or re-display the current page if there's an error
		var whereAfter=req.query.after;
		if(supplierError==true || packSizeError==true)
			res.redirect('/dsr/sprint6/login/dashboard/items/cycle/rejected/'+selectedItemId+'?after='+whereAfter+'&supplierError='+supplierError+'&packSizeError='+packSizeError+'&startingUnpaidItemCount='+startingUnpaidItemCount+'&unpaidItemRunning='+unpaidItemRunning);
		else if(whereAfter=="MAIN")
			res.redirect('/dsr/sprint6/login/dashboard/rejected');
		else if(whereAfter=="NEXT")
			res.redirect('/dsr/sprint6/login/dashboard/items/cycle/rejected/next?startingUnpaidItemCount='+startingUnpaidItemCount+'&unpaidItemRunning='+unpaidItemRunning);
		else // this shouldn't happen(!). go to main page anyway
			res.redirect('/dsr/sprint6/login/dashboard/rejected');
		
	});	
	
	
  }
};

var filterByService = function(service_slug) {
  return function(appointment) {
    return appointment.service === service_slug;
  }
}

var filterFaceToFace = function(appointment) {
  return appointment.appointment_type == 'face to face';
};

var filterFemaleGP = function(appointment) {
  return appointment.practitioner.gender == 'female' && appointment.practitioner.role == 'GP';
};

var filterBefore10 = function(appointment) {
  var hour = parseInt(appointment.appointment_time.split(':')[0], 10);
  return hour < 10;
};

var filterByPractitionerUuid = function(uuid) {
  return function(appointment) {
    return appointment.practitioner_uuid === uuid;
  }
}
