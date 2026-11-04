// Doctors' qualifications and professional experience (Arabic and English),
// from the clinic's sheet (Nov 2026), applied once by migrateV11 in
// lib/migrations.ts. One item per line, as the profile fields expect.
// Doctors are matched by id, or by Arabic name for those added later in
// the control panel (no id here).

export type DoctorProfileUpdate = {
  name: string;
  id?: string;
  qualificationsAr?: string;
  qualificationsEn?: string;
  experienceAr?: string;
  experienceEn?: string;
};

export const DOCTOR_PROFILES_V11: DoctorProfileUpdate[] = [
  {
    "name": "احمد العلياني",
    "id": "ahmed-alelyani",
    "qualificationsAr": "ماجستير والزمالة الأمريكية في علاج جذور واعصاب الاسنان\nالبورد الأمريكي في علاج جذور واعصاب الاسنان\nالزمالة الملكية الكندية في علاج جذور واعصاب الاسنان",
    "qualificationsEn": "Master's degree and American Fellowship in Endodontics\nAmerican Board of Endodontics\nRoyal College of Dentists of Canada Fellowship in Endodontics",
    "experienceAr": "استشاري علاج جذور واعصاب الأسنان\nاستاذ مساعد في علاج جذور وأعصاب الأسنان",
    "experienceEn": "Consultant Endodontist\nAssistant Professor of Endodontics"
  },
  {
    "name": "رائد ال منيع",
    "id": "raed-abdullah-al-manea",
    "qualificationsAr": "شهادة الاختصاص السعودي لعلاج جذور وعصب الاسنان\nالبورد السعودي لعلاج جذور وعصب الاسنان",
    "qualificationsEn": "Saudi Specialty Certificate in Endodontics\nSaudi Board of Endodontics",
    "experienceAr": "استشاري علاج جذور وعصب الاسنان\nاستاذ مشارك علاج جذور وعصب الاسنان بكلية طب الاسنان",
    "experienceEn": "Consultant Endodontist\nAssociate Professor of Endodontics, College of Dentistry"
  },
  {
    "name": "ناصر الشهري",
    "id": "nasser-alshehri",
    "qualificationsAr": "شهادة الاختصاص في علاج العصب وجذور الاسنان المتقدم\nالبورد السعودي لعلاج عصب وجذور الاسنان باستخدام احدث التقنيات",
    "qualificationsEn": "Advanced Specialty Certificate in Endodontics\nSaudi Board of Endodontics, using the latest technologies",
    "experienceAr": "استشاري علاج عصب وجذور الاسنان",
    "experienceEn": "Consultant Endodontist"
  },
  {
    "name": "امل شيبان",
    "id": "amel-shaiban",
    "qualificationsAr": "البورد السعودي لعلاج الجذور وعصب الأسنان",
    "qualificationsEn": "Saudi Board of Endodontics",
    "experienceAr": "استشاري علاج جذور وعصب الأسنان\nأستاذ مشارك علاج جذور وعصب الأسنان بجامعة الملك خالد\nبراءة اختراع معتمدة عن (جهاز للمعالجة الالية لقنوات جذر السن) - الهيئة السعودية للملكية الفكرية",
    "experienceEn": "Consultant Endodontist\nAssociate Professor of Endodontics, King Khalid University\nRegistered patent for \"A Device for Automated Root Canal Treatment\" – Saudi Authority for Intellectual Property"
  },
  {
    "name": "امل الزيداني",
    "id": "amal-alzaydani",
    "qualificationsAr": "بكالوريوس طب وجراحة الفم والأسنان\nالبورد السعودي (شهادة الاختصاص) في علاج عصب وجذور الأسنان",
    "qualificationsEn": "Bachelor of Dental Medicine and Surgery (BDS)\nSaudi Board (Specialty Certificate) in Endodontics",
    "experienceAr": "استشاري علاج عصب وجذور الأسنان\nعضو لجان التدريب في برنامجي البورد السعودي لعلاج عصب وجذور الأسنان وطب أسنان الأسرة",
    "experienceEn": "Consultant Endodontist\nMember of the training committees of the Saudi Board programs in Endodontics and Family Dentistry"
  },
  {
    "name": "عبدالعزيز ابو ملحه",
    "id": "abdulaziz-abu-melha",
    "qualificationsAr": "شهادة الاختصاص لطب علاج جذور وأعصاب الأسنان من جامعة نيويورك\nالبورد الأمريكي لطب علاج جذور وأعصاب الأسنان",
    "qualificationsEn": "Specialty Certificate in Endodontics, New York University\nAmerican Board of Endodontics",
    "experienceAr": "استشاري طب علاج جذور وأعصاب الأسنان\nأستاذ طب علاج جذور وأعصاب الأسنان بجامعة الملك خالد بأبها\nرئيس الجمعية السعودية لعلاج جذور وعصب الأسنان",
    "experienceEn": "Consultant Endodontist\nProfessor of Endodontics, King Khalid University, Abha\nPresident of the Saudi Endodontic Society"
  },
  {
    "name": "سعد سبره",
    "id": "saad-sabrah",
    "qualificationsAr": "البورد السعودي في علاج جذور وعصب الاسنان\nشهادة الاختصاص في طب جذور و أعصاب الأسنان",
    "qualificationsEn": "Saudi Board of Endodontics\nSpecialty Certificate in Endodontics",
    "experienceAr": "استشاري طب جذور و أعصاب الأسنان و المعالجة اللبية بمستشفى القوات المسلحة بالجنوب",
    "experienceEn": "Consultant in Endodontics, Armed Forces Hospital – Southern Region"
  },
  {
    "name": "عبدالمجيد الشهراني",
    "id": "abdulmajeed-al-shahrani",
    "qualificationsAr": "شهادة الاختصاص لعلاج وجراحة جذور وأعصاب الاسنان من جامعة نيويورك بالولايات المتحدة الامريكية\nالبورد الامريكي لعلاج جدور وأعصاب الاسنان\nالبورد الكندي لعلاج جذور وأعصاب الاسنان",
    "qualificationsEn": "Specialty Certificate in Endodontics and Endodontic Surgery, New York University, USA\nAmerican Board of Endodontics\nCanadian Board of Endodontics",
    "experienceAr": "استشاري علاج جذور و أعصاب الأسنان",
    "experienceEn": "Consultant Endodontist"
  },
  {
    "name": "فيصل عبود",
    "id": "faisal-ali-abboud",
    "qualificationsAr": "ماجستير طب الأسنان\nالشهادة السريرية في طب أسنان الأطفال و ذوي الاحتياجات الخاصة\nالبورد السعودي في طب أسنان الأطفال",
    "qualificationsEn": "Master's degree in Dentistry\nClinical Certificate in Pediatric and Special Needs Dentistry\nSaudi Board of Pediatric Dentistry",
    "experienceAr": "استشاري طب أسنان الأطفال\nأستاذ مشارك ورئيس قسم طب أسنان الأطفال وتقويم الأسنان بكلية طب الأسنان بجامعة الملك خالد\nمقيّم وطني بالمركز السعودي لاعتماد المنشآت الصحية (سباهي)",
    "experienceEn": "Consultant Pediatric Dentist\nAssociate Professor and Head of the Department of Pediatric Dentistry and Orthodontics, College of Dentistry, King Khalid University\nNational Surveyor, Saudi Central Board for Accreditation of Healthcare Institutions (CBAHI)"
  },
  {
    "name": "لجين عسيري",
    "id": "lujain-alasiri",
    "experienceAr": "طبيبة أسنان عامة ،بكالوريس في طب وجراحة الفم والأسنان\nتدريب في قسم علاج وجراحة اللثة (Periodontology): خبرة سريرية وعملية\nتدريب في قسم جراحة الوجه والفكين: خبرة سريرية وعملية بمستشفى عسير\nتدريب وخبرة سريرية وعملية في جامعة الملك خالد\nتدريب وخبرة سريرية وعملية بمستشفى وزارة الحرس الوطني – الرياض\nتدريب وخبرة سريرية وعملية مستشفى الولادة والأطفال -أبها",
    "experienceEn": "General Dentist, Bachelor of Dental Medicine and Surgery (BDS)\nTraining in the Department of Periodontology: clinical and practical experience\nTraining in the Department of Oral and Maxillofacial Surgery: clinical and practical experience at Aseer Hospital\nClinical and practical training and experience at King Khalid University\nClinical and practical training and experience at the Ministry of National Guard Hospital – Riyadh\nClinical and practical training and experience at the Maternity and Children's Hospital – Abha"
  },
  {
    "name": "علا داوؤد",
    "id": "ola-daoud",
    "qualificationsAr": "بكالوريوس طب وجراحة الفم والأسنان (BDS)\nاجتياز الجزء الأول من امتحان دبلوم عضوية كلية جراحي الأسنان الملكية البريطانية (MFDS Part 1)",
    "qualificationsEn": "Bachelor of Dental Medicine and Surgery (BDS)\nPassed Part 1 of the Membership of the Faculty of Dental Surgery exam, Royal College of Surgeons (MFDS Part 1)",
    "experienceAr": "خبرة 7 سنوات مع تدريب مكثف في قسم الاستعاضة السنية (Prosthodontics) مع مهارات سريرية متقدمة في هذا التخصص\nخبرة عملية في التركيبات السنية الثابتة والمتحركة، والمشاركة في تخطيط وتنفيذ الحالات التعويضية بالتعاون مع اساتذة الاستعاضة السنية\nخبرة في استخدام تقنيات طب الأسنان الرقمي، بما في ذلك الماسح الضوئي داخل الفم (3Shape Intraoral Scanner)",
    "experienceEn": "7 years of experience with intensive training in Prosthodontics and advanced clinical skills in the specialty\nPractical experience in fixed and removable prosthodontics, taking part in planning and executing restorative cases with prosthodontics professors\nExperience with digital dentistry technologies, including the 3Shape intraoral scanner"
  },
  {
    "name": "محمد ال مقبول",
    "id": "mohammed-almagbol",
    "qualificationsAr": "البورد السعودي في أمراض وجراحة اللثة وزراعة الأسنان",
    "qualificationsEn": "Saudi Board of Periodontics and Dental Implants",
    "experienceAr": "استشاري أمراض وجراحة اللثة وزراعة الأسنان\nأستاذ مشارك في كلية طب الأسنان بجامعة الملك خالد\nممثل الجمعية السعودية لأمراض وجراحة اللثة بالمنطقة الجنوبية",
    "experienceEn": "Consultant in Periodontics and Dental Implants\nAssociate Professor, College of Dentistry, King Khalid University\nRepresentative of the Saudi Society of Periodontology in the Southern Region"
  },
  {
    "name": "محمد النمر",
    "id": "mohammed-nimer-alqahtani",
    "qualificationsAr": "الزمالة الأمريكية في زراعة الأسنان\nماجستير في علم أحياء الفم جامعة بنسلفانيا – أمريكا\nشهادة الاختصاص لطب وجراحة اللثة من جامعة بنسلفانيا – أمريكا\nتصنيف الهيئة السعودية للتخصصات الصحية في علم أحياء الفم، مع تخصص دقيق في زراعة الأسنان\nترخيص زراعة الأسنان الجراحي والتعويضي من الهيئة السعودية للتخصصات الصحية",
    "qualificationsEn": "American Fellowship in Dental Implants\nMaster's degree in Oral Biology, University of Pennsylvania – USA\nSpecialty Certificate in Periodontics, University of Pennsylvania – USA\nClassified by the Saudi Commission for Health Specialties in Oral Biology, with a subspecialty in dental implants\nSurgical and prosthetic dental implant license from the Saudi Commission for Health Specialties",
    "experienceAr": "تخصص دقيق زراعة الأسنان، بخبرة 26 عاماً في طب وجراحة الفم والأسنان",
    "experienceEn": "Subspecialty in dental implants, with 26 years of experience in oral and dental medicine and surgery"
  },
  {
    "name": "عبدالله القرني",
    "qualificationsAr": "الزمالة الكندية في أمراض وجراحة اللثة وزراعة الأسنان\nالبورد الأمريكي في أمراض الفم والوجه والفكين\nشهادة الاختصاص الإكلينيكية في أمراض وجراحة اللثة وزراعة الأسنان - جامعة ولاية نيويورك في بافلو - الولايات المتحدة الأمريكية\nشهادة الاختصاص الإكلينيكية في أمراض الفم والوجه والفكين - جامعة ولاية نيويورك في بافلو - الولايات المتحدة الأمريكية\nماجستير علوم الفم - جامعة ولاية نيويورك في بافلو - الولايات المتحدة الأمريكية",
    "qualificationsEn": "Canadian Fellowship in Periodontics and Dental Implants\nAmerican Board of Oral Medicine\nClinical Specialty Certificate in Periodontics and Dental Implants – State University of New York at Buffalo – USA\nClinical Specialty Certificate in Oral Medicine – State University of New York at Buffalo – USA\nMaster of Oral Sciences – State University of New York at Buffalo – USA",
    "experienceAr": "أستاذ مشارك - كلية طب الأسنان - جامعة الملك خالد\nاستشاري أمراض وجراحة اللثة وزراعة الأسنان",
    "experienceEn": "Associate Professor – College of Dentistry – King Khalid University\nConsultant in Periodontics and Dental Implants"
  },
  {
    "name": "علي ال ظهر",
    "qualificationsAr": "بكالوريس طب وجراحة الفم والاسنان جامعة الملك خالد\nماجستير جراحة الفم والوجه والفكين جامعة رياض العلم\nالبورد السعودي لجراحة الفم والوجه والفكين",
    "qualificationsEn": "Bachelor of Dental Medicine and Surgery, King Khalid University\nMaster's degree in Oral and Maxillofacial Surgery, Riyadh Elm University\nSaudi Board of Oral and Maxillofacial Surgery",
    "experienceAr": "استشاري جراحة الفم والوجه والفكين وزراعة الاسنان\nاستشاري جراحة الوجه والفكين بمستشفى عسير المركزي\nرئيس برنامج البورد السعودي لجراحة الوجه والفكين بتجمع عسير الصحي",
    "experienceEn": "Consultant in Oral and Maxillofacial Surgery and Dental Implants\nConsultant Oral and Maxillofacial Surgeon, Aseer Central Hospital\nProgram Director, Saudi Board of Oral and Maxillofacial Surgery, Aseer Health Cluster"
  },
  {
    "name": "عبدالرحمن عسيري",
    "id": "abdulrahman-alasiri",
    "qualificationsAr": "البورد الامريكي لطب وجراحة اللثة وزراعة الأسنان\nشهادة الاختصاص لطب وجراحة اللثة وزراعة الأسنان جامعة بنسلفانيا بالولايات المتحدة الأمريكية",
    "qualificationsEn": "American Board of Periodontology and Dental Implants\nSpecialty Certificate in Periodontics and Dental Implants, University of Pennsylvania, USA",
    "experienceAr": "استشاري طب وجراحة اللثة وزراعة الأسنان\nاستاذ مشارك طب وجراحة اللثة بجامعة نجران",
    "experienceEn": "Consultant in Periodontics and Dental Implants\nAssociate Professor of Periodontics, Najran University"
  },
  {
    "name": "عبدالاله دغريري",
    "id": "abdulelah-daghriri",
    "qualificationsAr": "شهادة الاختصاص السعودية في اصلاح الاسنان\nالزمالة السعودية في زراعة الاسنان",
    "qualificationsEn": "Saudi Specialty Certificate in Restorative Dentistry\nSaudi Fellowship in Dental Implants",
    "experienceAr": "استشاري العلاج التحفظي وزراعة الاسنان\nنائب مدير مركز طب الأسنان بمستشفى القوات المسلحة بالجنوب",
    "experienceEn": "Consultant in Conservative Dentistry and Dental Implants\nDeputy Director of the Dental Center, Armed Forces Hospital – Southern Region"
  },
  {
    "name": "مانع الاحمري",
    "id": "manea-musa-al-ahmari",
    "qualificationsAr": "البورد السعودي في أمراض وجراحة اللثة - الهيئة السعودية للتخصصات الصحية - جامعة الملك عبدالعزيز",
    "qualificationsEn": "Saudi Board of Periodontics – Saudi Commission for Health Specialties – King Abdulaziz University",
    "experienceAr": "أستاذ امراض وجراحة اللثة وزراعة الاسنان بكلية طب الأسنان بجامعة الملك خالد\nاستشاري أمراض وجراحة اللثة وزراعة الأسنان\nحاصل على براءة اختراع معتمدة في تقنية بناء عظام الفك - الهيئة السعودية للملكية الفكرية\nمؤلف كتاب «الجراحة المجهرية في طب دواعم الأسنان» وكتاب «دليل المرشد الأكاديمي»\nحاصل على جائزة أبها للتميز العلمي",
    "experienceEn": "Professor of Periodontics and Dental Implants, College of Dentistry, King Khalid University\nConsultant in Periodontics and Dental Implants\nRegistered patent in jawbone regeneration technology – Saudi Authority for Intellectual Property\nAuthor of the books \"Microsurgery in Periodontics\" and \"The Academic Advisor's Guide\"\nRecipient of the Abha Award for Scientific Excellence"
  },
  {
    "name": "ابراهيم الشهراني",
    "id": "ibrahim-alshahrani",
    "qualificationsAr": "شهادة الاختصاص السريرية في تقويم الأسنان والوجه والفكين\nشهادة الماجستير في علوم تقويم الأسنان\nشهادة الدكتوراه في تقويم الأسنان من المملكة المتحدة",
    "qualificationsEn": "Clinical Specialty Certificate in Orthodontics and Dentofacial Orthopedics\nMaster's degree in Orthodontic Sciences\nPhD in Orthodontics, United Kingdom",
    "experienceAr": "استشاري تقويم الأسنان وعظام الوجه والفكين\nأستاذ تقويم الأسنان بكلية طب الأسنان بجامعة الملك خالد\nمتحدث ومدرب لشركة الاين لتقنية الانفزلاين على مستوى الشرق الأوسط وأوروبا وشمال إفريقيا\nاعلى مزود لتقنية الانفزلاين الوقائي على مستوى المملكة\nمدير برنامج الزمالة في تقويم الاسنان في كلية طب الأسنان بجامعة الملك خالد\nعميد كلية طب الاسنان بجامعة الملك خالد سابقاً",
    "experienceEn": "Consultant in Orthodontics and Dentofacial Orthopedics\nProfessor of Orthodontics, College of Dentistry, King Khalid University\nSpeaker and trainer for Align Technology (Invisalign) across the Middle East, Europe and North Africa\nTop provider of preventive Invisalign treatment in the Kingdom\nDirector of the Orthodontics Fellowship Program, College of Dentistry, King Khalid University\nFormer Dean of the College of Dentistry, King Khalid University"
  },
  {
    "name": "اثير ال غانم",
    "id": "atheer-al-ghanem",
    "qualificationsAr": "الزمالة الأمريكية في تقويم الأسنان وعظام الوجه والفكين – جامعة روتشستر، نيويورك، الولايات المتحدة الأمريكية\nالبورد الأمريكي في تقويم الأسنان وعظام الوجه والفكين (ABO)\nماجستير العلوم في طب الأسنان – جامعة روتشستر، نيويورك، الولايات المتحدة الأمريكية",
    "qualificationsEn": "American Fellowship in Orthodontics and Dentofacial Orthopedics – University of Rochester, New York, USA\nAmerican Board of Orthodontics (ABO)\nMaster of Science in Dentistry – University of Rochester, New York, USA",
    "experienceAr": "استشارية تقويم الأسنان وعظام الوجه والفكين\nمقدمة رعاية معتمدة لتقويم الأسنان الشفاف (Invisalign)، حاصلة على تدريب احترافي متخصص في ولاية نورث كارولاينا، الولايات المتحدة الأمريكية\nأستاذ مساعد – كلية طب الأسنان، جامعة الملك خالد، المملكة العربية السعودية\nأستاذ زائر – جامعة روتشستر، نيويورك، الولايات المتحدة الأمريكية",
    "experienceEn": "Consultant in Orthodontics and Dentofacial Orthopedics\nCertified Invisalign clear aligner provider, with specialized professional training in North Carolina, USA\nAssistant Professor – College of Dentistry, King Khalid University, Saudi Arabia\nVisiting Professor – University of Rochester, New York, USA"
  },
  {
    "name": "روان سداح",
    "id": "rawan-saddah",
    "qualificationsAr": "البورد السعودي بتقويم الأسنان وعظام الوجه والفكين",
    "qualificationsEn": "Saudi Board of Orthodontics and Dentofacial Orthopedics",
    "experienceAr": "استشارية تقويم الأسنان وعظام الوجه والفكين\nالمركز الأول بجوائز التميز فرع الطالب على مستوى جامعة الملك خالد\nافضل حالة اكلينيكية للأطباء المقيمين بالبورد السعودي",
    "experienceEn": "Consultant in Orthodontics and Dentofacial Orthopedics\nFirst place, Excellence Awards (Student category), King Khalid University\nBest Clinical Case among Saudi Board residents"
  },
  {
    "name": "ميلاف الشهراني",
    "id": "meelaf-alshahrani",
    "qualificationsAr": "شهادة الاختصاص في تقويم الأسنان وعظام الوجه والفكين\nالبورد السعودي والزمالة في تقويم الأسنان وعظام الوجه والفكين",
    "qualificationsEn": "Specialty Certificate in Orthodontics and Dentofacial Orthopedics\nSaudi Board and Fellowship in Orthodontics and Dentofacial Orthopedics",
    "experienceAr": "نائب أول تقويم الأسنان وعظام الوجه والفكين",
    "experienceEn": "Senior Registrar in Orthodontics and Dentofacial Orthopedics"
  },
  {
    "name": "منصور العمري",
    "id": "mansour-alamri",
    "qualificationsAr": "شهادة الاختصاص السعودية في تقويم الأسنان وعظام الوجه والفكين\nالبورد السعودي لتقويم الأسنان وعظام الوجه والفكين",
    "qualificationsEn": "Saudi Specialty Certificate in Orthodontics and Dentofacial Orthopedics\nSaudi Board of Orthodontics and Dentofacial Orthopedics",
    "experienceAr": "استشاري تقويم الأسنان وعظام الوجه والفكين",
    "experienceEn": "Consultant in Orthodontics and Dentofacial Orthopedics"
  },
  {
    "name": "علي الهيزعي",
    "id": "ali-alhaizaey",
    "experienceAr": "استشاري تقويم الأسنان وعظام الوجه والفكين\nخبرة مهنية وأكاديمية في مجال تقويم الأسنان المعدني و الشفاف للاطفال و البالغين لاكثر من عشر سنوات، مع اهتمام خاص بالتقنيات الحديثة والتخطيط الرقمي للعلاج باستخدام التقويم الشفاف\nمدير برنامج البورد السعودي لتقويم الأسنان والفكين- منطقة عسير\nمشاركات علمية ومحاضرات في مؤتمرات محلية ودولية\nحاصل على ١٠ براءات اختراع في مجال تقويم الأسنان مسجلة محليا و دوليا\nحاصل على ميداليتين ذهبيتين على ابتكاراته العلمية في اليابان و تايلند\nالعديد من الابحاث العلمية المنشورة في مجلات علمية\nمرشد ومدرب للأطباء ضمن برنامج تبادل الخبرات والإرشاد المهني بشركة انفزلاين (Peer-to-Peer Program)",
    "experienceEn": "Consultant in Orthodontics and Dentofacial Orthopedics\nOver ten years of professional and academic experience in metal and clear orthodontics for children and adults, with a special interest in modern technologies and digital treatment planning with clear aligners\nProgram Director, Saudi Board of Orthodontics – Aseer Region\nScientific contributions and lectures at local and international conferences\nHolder of 10 patents in orthodontics, registered locally and internationally\nWinner of two gold medals for his scientific innovations in Japan and Thailand\nNumerous research papers published in scientific journals\nMentor and trainer for doctors in Invisalign's experience-exchange and professional mentoring program (Peer-to-Peer Program)"
  },
  {
    "name": "غدير الوادعي",
    "id": "ghadeer-saleh-al-wadaei",
    "qualificationsAr": "البورد الأمريكي لاصلاح و تجميل الأسنان\nشهادة الاختصاص لاصلاح و تجميل الأسنان من جامعة انديانا بالولايات المتحدة الأمريكية\nماجستير اصلاح و تجميل الأسنان من جامعة انديانا بالولايات المتحدة الامريكية",
    "qualificationsEn": "American Board of Restorative and Cosmetic Dentistry\nSpecialty Certificate in Restorative and Cosmetic Dentistry, Indiana University, USA\nMaster's degree in Restorative and Cosmetic Dentistry, Indiana University, USA",
    "experienceAr": "استشاري اصلاح و تجميل الأسنان\nأستاذ مشارك في اصلاح الأسنان بجامعة الملك خالد",
    "experienceEn": "Consultant in Restorative and Cosmetic Dentistry\nAssociate Professor of Restorative Dentistry, King Khalid University"
  },
  {
    "name": "محمد الوادعي",
    "id": "mohammad-al-wadaei",
    "qualificationsAr": "البورد السعودي في إصلاح الأسنان (الزمالة والبورد السعودي ) - الهيئة السعودية للتخصصات الصحية\nزمالة زراعة الأسنان (AAID) - الأكاديمية الأمريكية لزراعة الأسنان\nبكالوريوس طب وجراحة الفم والأسنان - جامعة الملك سعود",
    "qualificationsEn": "Saudi Board in Restorative Dentistry (Saudi Fellowship and Board) – Saudi Commission for Health Specialties\nDental Implant Fellowship (AAID) – American Academy of Implant Dentistry\nBachelor of Dental Medicine and Surgery – King Saud University",
    "experienceAr": "استشاري الاصلاح والتجميل والتركيبات وزراعة الأسنان\nأستاذ مشارك - قسم إصلاح الأسنان - كلية طب الأسنان - جامعة الملك خالد\nباحث علمي بأكثر من 28 بحثاً منشوراً في مجلات طبية محكمة في مجالات تجميل، تركيبات، وزراعة الأسنان",
    "experienceEn": "Consultant in Restorative, Cosmetic and Prosthetic Dentistry and Dental Implants\nAssociate Professor – Department of Restorative Dentistry – College of Dentistry – King Khalid University\nResearcher with more than 28 papers published in peer-reviewed medical journals in cosmetic, prosthetic and implant dentistry"
  },
  {
    "name": "ندى العمودي",
    "id": "nadaa-alamoudi",
    "qualificationsAr": "البورد السعودي في إصلاح الأسنان",
    "qualificationsEn": "Saudi Board in Restorative Dentistry",
    "experienceAr": "استشاري إصلاح و تجميل الأسنان\nأستاذ مساعد بكلية طب الأسنان جامعة الملك خالد",
    "experienceEn": "Consultant in Restorative and Cosmetic Dentistry\nAssistant Professor, College of Dentistry, King Khalid University"
  },
  {
    "name": "محمد العمري",
    "id": "mohammed-alamri",
    "qualificationsAr": "حاصل على شهادة الماجستير في علوم طب الاسنان من الولايات المتحدة الأمريكية\nحاصل على شهادة الاختصاص الدقيق في طب اصلاح الاسنان من جامعة نوفا الجنوبية الشرقية بولاية فلوريدا بالولايات المتحدة الاميركية\nحاصل على زمالة طب الاسنان الشامل من جامعة نيويورك بالولايات المتحدة الأمريكية\nحاصل على البورد السعودي في تخصص اصلاح الاسنان\nحاصل على زمالة الاختصاص الدقيق في اصلاح الاسنان من الهيئة السعودية للتخصصات الصحية",
    "qualificationsEn": "Master's degree in Dental Sciences, USA\nSubspecialty Certificate in Restorative Dentistry, Nova Southeastern University, Florida, USA\nComprehensive Dentistry Fellowship, New York University, USA\nSaudi Board in Restorative Dentistry\nSubspecialty Fellowship in Restorative Dentistry, Saudi Commission for Health Specialties",
    "experienceAr": "استشاري اصلاح وتجميل الاسنان\nاستاذ مساعد بكلية طب الاسنان بجامعة الملك خالد",
    "experienceEn": "Consultant in Restorative and Cosmetic Dentistry\nAssistant Professor, College of Dentistry, King Khalid University"
  },
  {
    "name": "خالد الهندي",
    "id": "khalid-alhindi",
    "qualificationsAr": "البورد السعودي للإستعاضة السنية\nشهادة الاختصاص السعودية للإستعاضة السنية",
    "qualificationsEn": "Saudi Board of Prosthodontics\nSaudi Specialty Certificate in Prosthodontics",
    "experienceAr": "استشاري تجميل وتركيبات وزراعة الأسنان\nاستاذ مساعد بكلية طب الأسنان - جامعة نجران",
    "experienceEn": "Consultant in Cosmetic and Prosthetic Dentistry and Dental Implants\nAssistant Professor, College of Dentistry – Najran University"
  },
  {
    "name": "ناصر الاحمري",
    "id": "nasser-mesfer-al-ahmari",
    "qualificationsAr": "حاصل على شهادة الاختصاص في الاستعاضة السنية\nحاصل على البورد السعودي للاستعاضة السنية",
    "qualificationsEn": "Specialty Certificate in Prosthodontics\nSaudi Board of Prosthodontics",
    "experienceAr": "أستشاري الاستعاضة السنية والتجميل وزراعة الأسنان\nبروفيسور الاستعاضة السنية بجامعة الملك خالد\nعضو هيئة التدريس بجامعة الملك خالد\nرئيس برنامج البورد السعودي للاستعاضة السنية بالمنطقة الجنوبية 2019-2023",
    "experienceEn": "Consultant in Prosthodontics, Cosmetic Dentistry and Dental Implants\nProfessor of Prosthodontics, King Khalid University\nFaculty member, King Khalid University\nProgram Director, Saudi Board of Prosthodontics, Southern Region (2019–2023)"
  },
  {
    "name": "نهار القحطاني",
    "id": "nahar-abdullah-alqahtani",
    "qualificationsAr": "البورد الأمريكي في طب الأسنان المتقدم\nماجستير علوم طب الأسنان، جامعة روتشستر، الولايات المتحدة الأمريكية\nزمالة طب الأسنان المتقدم، جامعة روتشستر، الولايات المتحدة الأمريكية\nزمالة طب أسنان ذوي الاحتياجات الخاصة، جامعة روتشستر، الولايات المتحدة الأمريكية\nزمالة القيادة والتعليم في الإعاقات النمائية , جامعة روتشستر، الولايات المتحدة الأمريكية\nبكالوريوس طب وجراحة الأسنان، جامعة الإمام عبدالرحمن بن فيصل",
    "qualificationsEn": "American Board of Advanced Dentistry\nMaster of Science in Dentistry, University of Rochester, USA\nAdvanced Dentistry Fellowship, University of Rochester, USA\nSpecial Needs Dentistry Fellowship, University of Rochester, USA\nLeadership and Education in Developmental Disabilities Fellowship, University of Rochester, USA\nBachelor of Dental Medicine and Surgery, Imam Abdulrahman Bin Faisal University",
    "experienceAr": "نائب أول في طب أسنان الأسرة وطب أسنان ذوي الاحتياجات الخاصة للبالغين",
    "experienceEn": "Senior Registrar in Family Dentistry and Adult Special Needs Dentistry"
  }
];

/**
 * Update to the sheet (Nov 2026, second version): Arabic qualifications for
 * six more doctors (English translated to match). Applied by migrateV12.
 */
export const DOCTOR_PROFILES_V12: DoctorProfileUpdate[] = [
  {
    "name": "الهنوف ال مغامر",
    "id": "alhanuf-almoghamer",
    "qualificationsAr": "نائب أول طب أسنان أطفال وذوي الاحتياجات الخاصة\nالبورد السعودي في طب أسنان الأطفال",
    "qualificationsEn": "Senior Registrar in Pediatric and Special Needs Dentistry\nSaudi Board of Pediatric Dentistry"
  },
  {
    "name": "ريما البشري",
    "id": "rima-othman-albishri",
    "qualificationsAr": "بكالوريوس طب وجراحة الفم والأسنان من جامعة الملك خالد مع مرتبة الشرف الأولى\nطبيبة أسنان مصنفة من الهيئة السعودية للتخصصات الصحية\nحاصلة على عدة شهادات ودورات تدريبية في مجال الحشوات التجميلية والترميمية، وعلاج جذور الأسنان، وتبييض الأسنان\nتدريب وخبرة سريرية في مختلف تخصصات طب الأسنان",
    "qualificationsEn": "Bachelor of Dental Medicine and Surgery, King Khalid University, with First-Class Honours\nDentist classified by the Saudi Commission for Health Specialties\nSeveral certificates and training courses in cosmetic and restorative fillings, root canal treatment and teeth whitening\nClinical training and experience across dental specialties"
  },
  {
    "name": "عبدالمجيد القحطاني",
    "id": "abdulmajeed-alqahtani",
    "qualificationsAr": "طبيب أسنان عام، بكالوريوس طب وجراحة الفم والأسنان (BDS)\nتدريب علمي وخبرة سريرية في قسم التركيبات والاستعاضة السنية (Prosthodontics) في مستشفى جامعة الملك خالد\nتدريب علمي وخبرة سريرية في قسم التركيبات والاستعاضة السنية (Prosthodontics) في مستشفى القوات المسلحة بالمنطقة الجنوبية\nحاصل على دورات مكثفة وورش عمل وخبرة سريرية في استخدام تقنيات طب الأسنان الرقمي",
    "qualificationsEn": "General Dentist, Bachelor of Dental Medicine and Surgery (BDS)\nAcademic training and clinical experience in Prosthodontics, King Khalid University Hospital\nAcademic training and clinical experience in Prosthodontics, Armed Forces Hospital, Southern Region\nIntensive courses, workshops and clinical experience in digital dentistry"
  },
  {
    "name": "وليد عسيري",
    "id": "waleed-saeed-asiri",
    "qualificationsAr": "أستاذ إصلاح وتجميل الأسنان المشارك\nاستشاري إصلاح وتجميل الأسنان\nشهادة الاختصاص في إصلاح وتجميل الأسنان\nالبورد السعودي في إصلاح وتجميل الأسنان",
    "qualificationsEn": "Associate Professor of Restorative and Esthetic Dentistry\nConsultant in Restorative and Esthetic Dentistry\nSpecialty Certificate in Restorative and Esthetic Dentistry\nSaudi Board of Restorative and Esthetic Dentistry"
  },
  {
    "name": "محمد الشريف",
    "id": "mohammed-alsharif",
    "qualificationsAr": "استشاري إصلاح وتجميل الأسنان\nالبورد السعودي في إصلاح وتجميل الأسنان\nرئيس قسم إصلاح وتجميل الأسنان بمستشفى القوات المسلحة بالجنوب\nمشرف على برنامج الزمالة (البورد السعودي) لإصلاح الأسنان بمستشفى القوات المسلحة بالجنوب",
    "qualificationsEn": "Consultant in Restorative and Esthetic Dentistry\nSaudi Board of Restorative and Esthetic Dentistry\nHead of Restorative and Esthetic Dentistry, Armed Forces Hospital, Southern Region\nSupervisor of the Saudi Board (fellowship) program in Restorative Dentistry, Armed Forces Hospital, Southern Region"
  },
  {
    "name": "مالك ابا زيد",
    "id": "malek-abo-zeed",
    "qualificationsAr": "أخصائي الاستعاضة السنية وتركيبات وتجميل الأسنان\nماجستير الاستعاضة السنية – جامعة سيينا، إيطاليا\nزمالة كلية الجراحين الملكية في طب الأسنان العام – أيرلندا",
    "qualificationsEn": "Specialist in Prosthodontics and Esthetic Dentistry\nMaster's in Prosthodontics – University of Siena, Italy\nFellowship in General Dentistry, Royal College of Surgeons in Ireland"
  }
];
