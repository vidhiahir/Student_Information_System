if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const mongoose = require("mongoose");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const bcrypt = require("bcrypt");
const flash = require("express-flash");
const session = require("express-session");
const methodOverride = require("method-override");
const PDFDocument = require("pdfkit");
const { Table } = require("pdfkit-table");
const fs = require("fs");
const { type } = require("os");
const nodemailer = require("nodemailer");
const EmailTemplate = require("email-templates").EmailTemplate;
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const passportStudent = require("passport");
const passportInstructor = require("passport");
const passportAdmin = require("passport");

const initializePassportStudent = require("./passport-config-student");
const initializePassportInstructor = require("./passport-config-instructor");
const initializePassportAdmin = require("./passport-config-admin");

const { query } = require("express");

initializePassportStudent(
  passportStudent,
  (email) => Student.findOne({ email: email }),
  (id) => id
);

initializePassportInstructor(
  passportInstructor,
  (email) => Instructor.findOne({ email: email }),
  (id) => id
);

initializePassportAdmin(
  passportAdmin,
  (email) => Admin.findOne({ email: email }),
  (id) => id
);

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + "/public"));

app.use(flash());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passportStudent.initialize());
app.use(passportStudent.session());

app.use(passportInstructor.initialize());
app.use(passportInstructor.session());

app.use(passportAdmin.initialize());
app.use(passportAdmin.session());

app.use(methodOverride("_method"));
app.set("view engine", "ejs");
mongoose.set("strictQuery", true);
mongoose.connect(
  `mongodb+srv://devarsh_nagrecha:${process.env.PASSWORD}@cluster0.vqnm6ti.mongodb.net/SIS-Sprint1`,
  { useNewUrlParser: true }
);

const saltRounds = 10;

const degreeSchema = new mongoose.Schema({
  name: String,
});

const branchSchema = new mongoose.Schema({
  name: String,
});

const courseSchema = new mongoose.Schema({
  name: String,
  code: String,
  credits: Number,
  description: String,
});

const programSchema = new mongoose.Schema({
  degreeOffered: { type: mongoose.Schema.Types.ObjectId, ref: "Degree" },
  branchOffered: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
  coursesOffered: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
});

const semesterSchema = new mongoose.Schema({
  name: String,
  dateCreated: Date,
  addDrop: Boolean,
  programsOffered: [{ type: mongoose.Schema.Types.ObjectId, ref: "Program" }],
});

const studentSchema = new mongoose.Schema({
  firstname: String,
  middlename: String,
  lastname: String,
  studentID: String,
  mobileNO: String,
  email: String,
  myemail: String,
  password: String,
  dob: Date,
  gender: String,
  parentEmail: String,
  programRegistered: { type: mongoose.Schema.Types.ObjectId, ref: "Program" },
  profilePicture: Buffer,
  weight: Number,
  height: Number,
  bloodGroup: String,
  address: String,
  batch: String,
});

const adminSchema = new mongoose.Schema({
  email: String,
  password: String,
});

const instructorSchema = new mongoose.Schema({
  fullname: String,
  email: String,
  myemail: String,
  mobileNO: String,
  dob: Date,
  gender: String,
  password: String,
  profilePicture: Buffer,
  joiningDate: Date,
});

const courseAssignmentSchema = new mongoose.Schema({
  programAssigned: { type: mongoose.Schema.Types.ObjectId, ref: "Program" },
  courseAssigned: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  instructorAssigned: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Instructor",
  },
  semesterAssigned: { type: mongoose.Schema.Types.ObjectId, ref: "Semester" },
});

const courseEnrollmentSchema = new mongoose.Schema({
  courseEnrolled: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  studentEnrolled: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  semesterEnrolled: { type: mongoose.Schema.Types.ObjectId, ref: "Semester" },
  grade: Number,
  attendance: { type: Number, min: 0, max: 100 },
  dateEnrolled: Date,
});

const feeHistorySchema = new mongoose.Schema({
  semesterFee: { type: mongoose.Schema.Types.ObjectId, ref: "Semester" },
  studentEnrolled: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  feeStatus: Boolean,
  feePaid: Map,
  datePaid: Date,
});

const feeSchema = new mongoose.Schema({
  programFee: { type: mongoose.Schema.Types.ObjectId, ref: "Program" },
  feeStructure: Map,
});

const complainBoxSchema = new mongoose.Schema({
  studentComplained: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  complain: String,
  dateComplained: Date,
  status: Boolean,
});

const Branch = mongoose.model("Branch", branchSchema);
const Degree = mongoose.model("Degree", degreeSchema);
const Course = mongoose.model("Course", courseSchema);
const Program = mongoose.model("Program", programSchema);
const Semester = mongoose.model("Semester", semesterSchema);

const Admin = mongoose.model("Admin", adminSchema);
const Student = mongoose.model("Student", studentSchema);
const Instructor = mongoose.model("Instructor", instructorSchema);

const CourseAssignment = mongoose.model(
  "CourseAssignment",
  courseAssignmentSchema
);
const CourseEnrollment = mongoose.model(
  "CourseEnrollment",
  courseEnrollmentSchema
);
const ComplainBox = mongoose.model("ComplainBox", complainBoxSchema);

const Fee = mongoose.model("Fee", feeSchema);
const FeeHistory = mongoose.model("FeeHistory", feeHistorySchema);

//done login page update password add new student ,semster registration for new student, student trie to access add drop course
app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/support", (req, res) => {
  res.render("support.ejs");
});
app.get("/adminHome", checkAuthenticatedAdmin, (req, res) => {
  Admin.findOne({ _id: req.user }).then((user) => {
    res.render("adminHome.ejs", { user });
  });
});

app.get("/viewCourse", checkAuthenticatedAdmin, (req, res) => {
  Course.find({})
    .then((course) => {
      res.render("viewCourse.ejs", { course });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post("/viewCourse", checkAuthenticatedAdmin, (req, res) => {
  if (req.body.delete) {
    Course.deleteOne({ _id: req.body.delete })
      .then(() => {
        Course.find({})
          .then((course) => {
            res.redirect("/adminHome");
          })
          .catch((err) => {
            console.error(err);
          });
      })
      .catch((err) => {
        console.error(err);
      });
  } else {
    Course.findOne({ _id: req.body.edit })
      .then((course) => {
        res.render("updateCourse.ejs", { course });
      })
      .catch((err) => {
        console.error(err);
      });
  }
});

app.post("/updateCourse", checkAuthenticatedAdmin, (req, res) => {
  Course.updateOne(
    { _id: req.body.btn },
    {
      name: req.body.name,
      credits: req.body.credits,
      code: req.body.code,
      description: req.body.description,
    }
  )
    .then(() => {
      Course.find({})
        .then((course) => {
          res.render("viewCourse.ejs", { course });
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.get("/viewDegree", checkAuthenticatedAdmin, (req, res) => {
  Degree.find({})
    .then((degree) => {
      res.render("viewDegree.ejs", { degree });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post("/viewDegree", checkAuthenticatedAdmin, (req, res) => {
  if (req.body.delete) {
    Degree.deleteOne({ _id: req.body.delete })
      .then(() => {
        Degree.find({})
          .then((degree) => {
            res.render("viewDegree.ejs", { degree });
          })
          .catch((err) => {
            console.error(err);
          });
      })
      .catch((err) => {
        console.error(err);
      });
  } else {
    Degree.findOne({ _id: req.body.edit })
      .then((degree) => {
        res.render("updateDegree.ejs", { degree });
      })
      .catch((err) => {
        console.error(err);
      });
  }
});

app.post("/updateDegree", checkAuthenticatedAdmin, (req, res) => {
  Degree.updateOne({ _id: req.body.btn }, { name: req.body.name })
    .then(() => {
      Degree.find({})
        .then((degree) => {
          res.render("viewDegree.ejs", { degree });
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.get("/viewBranch", checkAuthenticatedAdmin, (req, res) => {
  Branch.find({})
    .then((branch) => {
      res.render("viewBranch.ejs", { branch });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post("/viewBranch", checkAuthenticatedAdmin, (req, res) => {
  if (req.body.delete) {
    Branch.deleteOne({ _id: req.body.delete })
      .then(() => {
        Branch.find({})
          .then((branch) => {
            res.redirect("/viewBranch");
          })
          .catch((err) => {
            console.error(err);
          });
      })
      .catch((err) => {
        console.error(err);
      });
  } else {
    Branch.findOne({ _id: req.body.edit })
      .then((branch) => {
        res.render("updateBranch.ejs", { branch });
      })
      .catch((err) => {
        console.error(err);
      });
  }
});

app.post("/updateBranch", checkAuthenticatedAdmin, (req, res) => {
  Branch.updateOne({ _id: req.body.btn }, { name: req.body.name })
    .then(() => {
      Branch.find({})
        .then((branch) => {
          res.render("viewBranch.ejs", { branch });
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.get("/viewProgram", checkAuthenticatedAdmin, (req, res) => {
  Program.find({})
    .populate(["degreeOffered", "branchOffered", "coursesOffered"])
    .exec()
    .then((program) => {
      res.render("viewProgram.ejs", { program });
    })
    .catch((err) => {
      console.log(err);
    });
});

app.post("/viewProgram", checkAuthenticatedAdmin, (req, res) => {
  if (req.body.delete) {
    Program.deleteOne({ _id: req.body.delete })
      .then(() => {
        Program.find({})
          .then((program) => {
            res.render("viewProgram.ejs", { program });
          })
          .catch((err) => {
            console.error(err);
          });
      })
      .catch((err) => {
        console.error(err);
      });
  } else {
    Program.findOne({ _id: req.body.edit })
      .then((program) => {
        res.render("updateProgram.ejs", { program });
      })
      .catch((err) => {
        console.error(err);
      });
  }
});

app.get("/viewSemester", checkAuthenticatedAdmin, (req, res) => {
  Semester.find({})
    .sort({ dateCreated: -1 })
    .then((semester) => {
      res.render("viewSemester.ejs", { semester });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post("/viewSemester", checkAuthenticatedAdmin, (req, res) => {
  if (req.body.delete) {
    Semester.findOne({ _id: req.body.delete })
      .then((semester) => {
        CourseAssignment.deleteMany({ semesterAssigned: semester })
          .then(() => {
            Semester.deleteOne({ _id: req.body.delete })
              .then(() => {
                res.redirect("/adminHome");
              })
              .catch((err) => {
                console.error(err);
              });
          })
          .catch((err) => {
            console.error(err);
          });
      })
      .catch((err) => {
        console.error(err);
      });
  } else {
  }
});

app.get("/addCourse", checkAuthenticatedAdmin, (req, res) => {
  res.render("addCourse.ejs");
});

app.post("/addCourse", checkAuthenticatedAdmin, (req, res) => {
  const newCourse = new Course({
    name: req.body.name,
    code: req.body.code,
    credits: req.body.credits,
    description: req.body.description,
  });

  newCourse.save();
  res.redirect("/adminHome");
});

app.get("/addDegree", checkAuthenticatedAdmin, (req, res) => {
  res.render("addDegree.ejs");
});

app.post("/addDegree", checkAuthenticatedAdmin, (req, res) => {
  const newDegree = new Degree({
    name: req.body.name,
  });

  newDegree.save();
  res.redirect("/viewDegree");
});

app.get("/addBranch", checkAuthenticatedAdmin, (req, res) => {
  res.render("addBranch.ejs");
});

app.post("/addBranch", checkAuthenticatedAdmin, (req, res) => {
  const newBranch = new Branch({
    name: req.body.name,
  });

  newBranch.save();
  res.redirect("/viewBranch");
});

app.get("/addProgram", checkAuthenticatedAdmin, (req, res) => {
  Degree.find({})
    .then((degree) => {
      Branch.find({})
        .then((branch) => {
          Course.find({})
            .then((course) => {
              res.render("addProgram.ejs", { degree, branch, course });
            })
            .catch((err) => {
              console.error(err);
            });
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post("/addProgram", checkAuthenticatedAdmin, (req, res) => {
  Degree.findById(req.body.degree)
    .then((degree) => {
      Branch.findById(req.body.branch)
        .then((branch) => {
          Course.find({ _id: { $in: req.body.course } })
            .then((course) => {
              const newProgram = new Program({
                degreeOffered: degree,
                branchOffered: branch,
                coursesOffered: course,
              });

              newProgram.save();
              console.log(newProgram);
              res.redirect("/adminHome");
            })
            .catch((err) => {
              console.error(err);
            });
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.get("/addSemester", checkAuthenticatedAdmin, (req, res) => {
  Program.find({})
    .populate(["degreeOffered", "branchOffered", "coursesOffered"])
    .exec()
    .then((program) => {
      res.render("addSemester.ejs", { program });
    })
    .catch((err) => {
      console.log(err);
    });
});

app.post("/addSemester", checkAuthenticatedAdmin, (req, res) => {
  const newSemester = new Semester({
    name: req.body.name,
    dateCreated: new Date(),
    programsOffered: req.body.program,
    addDrop: false,
  });

  newSemester
    .save()
    .then((savedSemester) => {
      return Semester.populate(savedSemester, {
        path: "programsOffered",
        populate: [
          { path: "degreeOffered", model: Degree },
          { path: "branchOffered", model: Branch },
          { path: "coursesOffered", model: Course },
        ],
      });
    })
    .then((populatedSemester) => {
      Instructor.find({})
        .then((instructor) => {
          res.render("assignCourse.ejs", { populatedSemester, instructor });
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post("/assignCourse", checkAuthenticatedAdmin, (req, res) => {
  for (var i = 0; i < req.body.courseAssigned.length; i++) {
    const tuple = req.body.courseAssigned[i].split(" ");

    Semester.findById(tuple[0])
      .then((semester) => {
        Program.findById(tuple[1])
          .then((program) => {
            Course.findById(tuple[2])
              .then((course) => {
                Instructor.findById(tuple[3])
                  .then((instructor) => {
                    const newCourseAssignment = new CourseAssignment({
                      semesterAssigned: semester,
                      programAssigned: program,
                      courseAssigned: course,
                      instructorAssigned: instructor,
                    });

                    newCourseAssignment.save();
                    // res.redirect('/generate-pdf');
                  })
                  .catch((err) => {
                    console.error(err);
                  });
              })
              .catch((err) => {
                console.error(err);
              });
          })
          .catch((err) => {
            console.error(err);
          });
      })
      .catch((err) => {
        console.error(err);
      });
  }

  const html = `
        <script>
        window.open('/generate-pdf', '_blank');
        window.location.href='/adminHome';
        </script>
    `;

  res.send(html);
});

app.get("/generate-pdf", checkAuthenticatedAdmin, (req, res) => {
  const doc = new PDFDocument();
  const writeStream = fs.createWriteStream("example.pdf");
  doc.pipe(res);

  Semester.find()
    .sort({ dateCreated: -1 })
    .limit(1)
    .populate({
      path: "programsOffered",
      populate: [
        { path: "degreeOffered", model: Degree },
        { path: "branchOffered", model: Branch },
        { path: "coursesOffered", model: Course },
      ],
    })
    .exec()
    .then((semester) => {
      CourseAssignment.find({ semesterAssigned: semester })
        .populate([
          {
            path: "programAssigned",
            populate: [
              { path: "degreeOffered", model: Degree },
              { path: "branchOffered", model: Branch },
            ],
          },
          {
            path: "instructorAssigned",
          },
          {
            path: "courseAssigned",
          },
          {
            path: "semesterAssigned",
          },
        ])
        .exec()
        .then((semesterAssignments) => {
          doc
            .fontSize(20)
            .text(semester[0].name, { align: "center" })
            .moveDown();

          for (var i = 0; i < semesterAssignments.length; i++) {
            doc
              .fontSize(10)
              .text(
                `${semesterAssignments[i].programAssigned.degreeOffered.name} ${semesterAssignments[i].programAssigned.branchOffered.name} - ${semesterAssignments[i].courseAssigned.name} : ${semesterAssignments[i].instructorAssigned.fullname}`,
                { align: "center" }
              )
              .moveDown();
          }

          doc.end();
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });
  // doc.end();

  // fetch data from the database

  // doc.fontSize(20)
  //     .text('My Complex PDF Document', { align: 'center' })
  //     .moveDown();

  // doc.fontSize(16)
  //     .text('Table of Contents', { underline: true })
  //     .moveDown();

  // doc.list([
  //     { text: 'Introduction', link: '#introduction' },
  //     { text: 'Chapter 1 - Getting Started', link: '#chapter1' },
  //     { text: 'Chapter 2 - Advanced Topics', link: '#chapter2' },
  // ]);

  // doc.addPage();
  // doc.fontSize(24)
  //     .text('Introduction', { id: 'introduction', underline: true })
  //     .moveDown();

  // doc.fontSize(16)
  //     .text('Welcome to my complex PDF document!')
  //     .moveDown();

  // doc.fontSize(24)
  //     .text('Chapter 1 - Getting Started', { id: 'chapter1', underline: true })
  //     .moveDown();

  // doc.fontSize(16)
  //     .text('This chapter will cover the basics of getting started with my complex PDF document.')
  //     .moveDown();

  // doc.fontSize(24)
  //     .text('Chapter 2 - Advanced Topics', { id: 'chapter2', underline: true })
  //     .moveDown();

  // doc.fontSize(16)
  //     .text('This chapter will cover some more advanced topics related to my complex PDF document.');
});

app.get("/addStudent", checkAuthenticatedAdmin, (req, res) => {
  res.render("addStudent.ejs");
});

app.post("/addStudent", checkAuthenticatedAdmin, (req, res) => {
  if (req.body.email.split("@")[1] != "daiict.ac.in") {
    const title = "ERROR";
    const message = "Invalid email!";
    const icon = "error";
    const href = "/adminHome";
    res.render("alert.ejs", { title, message, icon, href });
  }

  const ID = req.body.email.split("@")[0];
  const BT = req.body.email.substr(0, 4);

  function generateP() {
    var pass = "";
    var str =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + "abcdefghijklmnopqrstuvwxyz0123456789@#$";

    for (let i = 1; i <= 10; i++) {
      var char = Math.floor(Math.random() * str.length + 1);

      pass += str.charAt(char);
    }

    return pass;
  }

  Student.findOne({ email: req.body.email })
    .then((student) => {
      if (student != null) {
        const title = "ERROR";
        const message = "Student email already exists!";
        const icon = "error";
        const href = "/adminHome";
        res.render("alert.ejs", { title, message, icon, href });
      } else {
        const randomPass = generateP();
        bcrypt
          .hash(randomPass, saltRounds)
          .then((hashedPassword) => {
            const newStudent = new Student({
              email: req.body.email,
              password: hashedPassword,
              studentID: ID,
              batch: BT,
            });

            newStudent.save();

            var transporter = nodemailer.createTransport({
              service: "Outlook365",
              host: "smtp.office365.com",
              port: "587",
              tls: {
                ciphers: "SSLv3",
                rejectUnauthorized: false,
              },
              auth: {
                user: "e-campus-daiict@outlook.com",
                pass: process.env.GMAILPASSWORD,
              },
            });

            var mailOptions = {
              from: "e-campus-daiict@outlook.com",
              to: req.body.email,
              subject: "Account created",
              html: `
                            <h2> Student account has been created. </h2>
                            <p> Your credentials are: </p>
                            <p> <b> Email ID : </b> ${req.body.email} </p>
                            <p> <b> Password : </b> ${randomPass} </p> 
                            <a href="https://e-campus-vugi.onrender.com/studentLogin" >Click here to login</a>
                            `,
            };

            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                const title = "ERROR";
                const message = "Unknown error occurred, please try again!";
                const icon = "error";
                const href = "/adminHome";
                res.render("alert.ejs", { title, message, icon, href });
              } else {
                console.log("Email sent: " + info.response);
              }
            });

            const title = "SUCCESS";
            const message = "Student added successfully!";
            const icon = "success";
            const href = "/adminHome";
            res.render("alert.ejs", { title, message, icon, href });
          })
          .catch((err) => {
            console.log("Error:", err);
          });
      }
    })
    .catch((err) => {
      console.log("Error:", err);
    });
});

app.get("/addInstructor", checkAuthenticatedAdmin, (req, res) => {
  res.render("addInstructor.ejs");
});

app.post("/addInstructor", checkAuthenticatedAdmin, (req, res) => {
  if (req.body.email.split("@")[1] != "daiict.ac.in") {
    const title = "ERROR";
    const message = "Invalid email!";
    const icon = "error";
    const href = "/adminHome";
    res.render("alert.ejs", { title, message, icon, href });
  }

  function generateP() {
    var pass = "";
    var str =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + "abcdefghijklmnopqrstuvwxyz0123456789@#$";

    for (let i = 1; i <= 10; i++) {
      var char = Math.floor(Math.random() * str.length + 1);

      pass += str.charAt(char);
    }

    return pass;
  }

  Instructor.findOne({ email: req.body.email })
    .then((instructor) => {
      if (instructor != null) {
        const title = "ERROR";
        const message = "Instructor email already exists!";
        const icon = "error";
        const href = "/adminHome";
        res.render("alert.ejs", { title, message, icon, href });
      } else {
        const randomPass = generateP();
        bcrypt
          .hash(randomPass, saltRounds)
          .then((hashedPassword) => {
            const newInstructor = new Instructor({
              email: req.body.email,
              fullname: req.body.fullname,
              password: hashedPassword,
              joiningDate: new Date(),
            });

            newInstructor.save();

            var transporter = nodemailer.createTransport({
              service: "Outlook365",
              host: "smtp.office365.com",
              port: "587",
              tls: {
                ciphers: "SSLv3",
                rejectUnauthorized: false,
              },
              auth: {
                user: "e-campus-daiict@outlook.com",
                pass: process.env.GMAILPASSWORD,
              },
            });

            var mailOptions = {
              from: "e-campus-daiict@outlook.com",
              to: req.body.email,
              subject: "Account created",
              html: `
                            <h2> Faculty account has been created. </h2>
                            <p> Your credentials are: </p>
                            <p> <b> Email ID : </b> ${req.body.email} </p>
                            <p> <b> Password : </b> ${randomPass} </p> 
                            <a href="https://e-campus-vugi.onrender.com/instructorLogin" >Click here to login</a>
                            `,
            };

            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                const title = "ERROR";
                const message = "Unknown error occurred, please try again!";
                const icon = "error";
                const href = "/adminHome";
                res.render("alert.ejs", { title, message, icon, href });
                console.log(error);
              } else {
                console.log("Email sent: " + info.response);
              }
            });

            const title = "SUCCESS";
            const message = "Instructor added successfully!";
            const icon = "success";
            const href = "/adminHome";
            res.render("alert.ejs", { title, message, icon, href });
          })
          .catch((err) => {
            console.log("Error:", err);
          });
      }
    })
    .catch((err) => {
      console.log("Error:", err);
    });
});

app.get("/addAdmin", (req, res) => {
  res.render("addAdmin.ejs");
});

app.post("/addAdmin", checkAuthenticatedAdmin, (req, res) => {
  Admin.findOne({ email: req.body.email })
    .then((admin) => {
      if (admin != null) {
        res.redirect("/adminHome");
      } else {
        bcrypt
          .hash(req.body.password, saltRounds)
          .then((hashedPassword) => {
            const newAdmin = new Admin({
              email: req.body.email,
              password: hashedPassword,
            });

            newAdmin.save();

            res.redirect("/addAdmin");
          })
          .catch((err) => {
            console.log("Error:", err);
          });
      }
    })
    .catch((err) => {
      console.log("Error:", err);
    });
});

app.get("/studentLogin", checkNotAuthenticatedStudent, (req, res) => {
  // const messages = req.flash('error');

  // console.log(messages);
  // if (messages=="No such email registered!")
  //     res.status(400).json({ message: "No such email registered!" });
  // else if (messages=="Incorrect password!")
  //     res.status(400).json({ message: "Incorrect password!" });
  // else if (messages=="Missing credentials")
  //     res.status(400).json({ message: "Missing credentials" });
  // else
  res.render("studentLogin.ejs");
});

app.post(
  "/studentLogin",
  passportStudent.authenticate("student", {
    successRedirect: "/studentHome",
    failureRedirect: "/studentLogin",
    failureFlash: true,
  })
);

app.get("/studentHome", checkAuthenticatedStudent, (req, res) => {
  Student.findOne({ _id: req.user })
    .then((student) => {
      if (student.firstname == null) {
        // Student logging for the first time
        Program.find({})
          .populate(["degreeOffered", "branchOffered", "coursesOffered"])
          .exec()
          .then((program) => {
            // console.log(student + " " + req.user);
            res.render("studentDetails.ejs", { program, student });
          })
          .catch((err) => {
            console.log(err);
          });
      } else {
        Student.findOne({ _id: req.user })
          .then((student) => {
            res.render("studentHome.ejs", { student });
          })
          .catch((err) => {
            console.log(err);
          });
      }
    })
    .catch((err) => {
      console.log(err);
    });
});
isValidPassword = (password) => {
  // for checking if password length is between 8 and 15
  if (!(password.length >= 8 && password.length <= 15)) {
    return false;
  }

  // to check space
  if (password.indexOf(" ") !== -1) {
    return false;
  }

  // for digits from 0 to 9
  let count = 0;
  for (let i = 0; i <= 9; i++) {
    if (password.indexOf(i) !== -1) {
      count = 1;
    }
  }
  if (count === 0) {
    return false;
  }

  // for special characters
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return false;
  }

  // for capital letters
  count = 0;
  for (let i = 65; i <= 90; i++) {
    if (password.indexOf(String.fromCharCode(i)) !== -1) {
      count = 1;
    }
  }
  if (count === 0) {
    return false;
  }

  // for small letters
  count = 0;
  for (let i = 97; i <= 122; i++) {
    if (password.indexOf(String.fromCharCode(i)) !== -1) {
      count = 1;
    }
  }
  if (count === 0) {
    return false;
  }

  // if all conditions fail
  return true;
}
app.post(
  "/studentDetails",
  checkAuthenticatedStudent,
  upload.single("picture"),
  (req, res) => {
    if (req.body.mobileNO.length != 10) {
      const title = "ERROR";
      const message = "Enter valid Mobile no.";
      const icon = "error";
      const href = "/studentHome";
      res.status(401).render("alert.ejs", { title, message, icon, href });
    }
    else if (req.body.password != req.body.repassword) {
      const title = "ERROR";
      const message = "Passwords do not match.";
      const icon = "error";
      const href = "/studentHome";
      res.status(401).render("alert.ejs", { title, message, icon, href });
      // passwords do not match
    }
    else if (!isValidPassword(req.body.password)) {
      const title = "ERROR";
      const message = "Password should contain 8 to 15 characters with atleast 1 special character, 1 capital letter, 1 small letter and 1 number with zero spaces.";
      const icon = "error";
      const href = "/studentHome";
      res.status(401).render("alert.ejs", { title, message, icon, href });
    }
    else {
      bcrypt
        .hash(req.body.password, saltRounds)
        .then((hashedPassword) => {

          if (req.file)
          {
            Student.updateOne(
              { _id: req.user },
              {
                firstname: req.body.firstname,
                middlename: req.body.middlename,
                lastname: req.body.lastname,
                programRegistered: req.body.myProgram,
                dob: req.body.dob,
                myemail: req.body.myemail,
                parentEmail: req.body.parentEmail,
                gender: req.body.gender,
                mobileNO: req.body.mobileNO,
                password: hashedPassword,
                profilePicture: req.file.buffer,
                weight: req.body.weight,
                height: req.body.height,
                address: req.body.address,
                bloodGroup: req.body.bloodGroup,
              }
            )
              .then(() => {
                Student.findOne({ _id: req.user })
                  .then((student) => {
  
                    res.render("studentHome.ejs", { student });
                  })
                  .catch((err) => {
                    console.log(err);
                  });
              })
              .catch((err) => {
                console.log(err);
              });
          }

          else
          {
            Student.updateOne(
              { _id: req.user },
              {
                firstname: req.body.firstname,
                middlename: req.body.middlename,
                lastname: req.body.lastname,
                programRegistered: req.body.myProgram,
                dob: req.body.dob,
                myemail: req.body.myemail,
                parentEmail: req.body.parentEmail,
                gender: req.body.gender,
                mobileNO: req.body.mobileNO,
                password: hashedPassword,
                weight: req.body.weight,
                height: req.body.height,
                address: req.body.address,
                bloodGroup: req.body.bloodGroup,
              }
            )
              .then(() => {
                Student.findOne({ _id: req.user })
                  .then((student) => {
  
                    res.render("studentHome.ejs", { student });
                  })
                  .catch((err) => {
                    console.log(err);
                  });
              })
              .catch((err) => {
                console.log(err);
              });
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }
);
app.get("/instructorLogin", checkNotAuthenticatedInstructor, (req, res) => {
  res.render("instructorLogin.ejs");
});

app.post(
  "/instructorLogin",
  passportInstructor.authenticate("instructor", {
    successRedirect: "/instructorHome",
    failureRedirect: "/instructorLogin",
    failureFlash: true,
  })
);

app.post('/viewComplains', checkAuthenticatedAdmin, (req, res) => {

  for (var i = 0; i < req.body.complain.length; i++) {
    ComplainBox.findOneAndUpdate({ '_id': req.body.complain[i] }, { status: true })
      .then((complain) => {

      })
  }
  const title = "SUCCESS";
  const message = "Complains marked as resolved!";
  const icon = "success";
  const href = "/adminHome";
  res.render("alert.ejs", { title, message, icon, href });
})

app.get("/instructorHome", checkAuthenticatedInstructor, (req, res) => {
  Instructor.findOne({ _id: req.user })
    .then((instructor) => {
      if (instructor.dob == null) {
        console.log(instructor);
        res.render("instructorDetails.ejs", { instructor });
      } else {
        res.render("instructorHome.ejs", { instructor });
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

app.post("/instructorDetails", upload.single("picture"), checkAuthenticatedInstructor, (req, res) => {
  //console.log(req.body.mobileNO);
  if (req.body.mobileNO.length != 10) {
    const title = "ERROR";
    const message = "Enter valid Mobile no.";
    const icon = "error";
    const href = "/instructorHome";
    res.status(401).render("alert.ejs", { title, message, icon, href });
  }
  else if (req.body.password != req.body.repassword) {
    const title = "ERROR";
    const message = "Passwords do not match.";
    const icon = "error";
    const href = "/instructorHome";
    res.status(401).render("alert.ejs", { title, message, icon, href });
    // passwords do not match
  }
  else if (!isValidPassword(req.body.password)) {
    const title = "ERROR";
    const message = "Password should contain 8 to 15 characters with atleast 1 special character, 1 capital letter, 1 small letter and 1 number with zero spaces.";
    const icon = "error";
    const href = "/instructorHome";
    res.status(401).render("alert.ejs", { title, message, icon, href });
  }
  else {
    bcrypt
      .hash(req.body.password, saltRounds)
      .then((hashedPassword) => {

        if (req.file)
        {
          Instructor.updateOne(
            { _id: req.user },
            {
              dob: req.body.dob,
              myemail: req.body.myemail,
              gender: req.body.gender,
              mobileNO: req.body.mobileNO,
              password: hashedPassword,
              profilePicture: req.file.buffer
            }
          )
            .then(() => {
              Instructor.findOne({ _id: req.user })
                .then((instructor) => {
                  res.render("instructorHome.ejs", { instructor });
                })
                .catch((err) => {
                  console.log(err);
                });
            })
            .catch((err) => {
              console.log(err);
            });
        }

        else
        {
          Instructor.updateOne(
            { _id: req.user },
            {
              dob: req.body.dob,
              myemail: req.body.myemail,
              gender: req.body.gender,
              mobileNO: req.body.mobileNO,
              password: hashedPassword
            }
          )
            .then(() => {
              Instructor.findOne({ _id: req.user })
                .then((instructor) => {
                  res.render("instructorHome.ejs", { instructor });
                })
                .catch((err) => {
                  console.log(err);
                });
            })
            .catch((err) => {
              console.log(err);
            });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }
});

app.get("/adminLogin", checkNotAuthenticatedAdmin, (req, res) => {
  res.render("adminLogin.ejs");
});

app.post(
  "/adminLogin",
  passportInstructor.authenticate("admin", {
    successRedirect: "/adminHome",
    failureRedirect: "/adminLogin",
    failureFlash: true,
  })
);

app.get("/adminHome", checkAuthenticatedAdmin, (req, res) => {
  Admin.findOne({ _id: req.user })
    .then((admin) => {
      res.render("adminHome.ejs", { admin });
    })
    .catch((err) => {
      console.log(err);
    });
});

app.get("/semesterRegistration", checkAuthenticatedStudent, (req, res) => {
  Semester.find()
    .sort({ dateCreated: -1 })
    .limit(1)
    .populate({
      path: "programsOffered",
      populate: [
        { path: "degreeOffered", model: Degree },
        { path: "branchOffered", model: Branch },
        { path: "coursesOffered", model: Course },
      ],
    })
    .exec()
    .then((semester) => {
      Student.findOne({ _id: req.user })
        .populate("programRegistered")
        .exec()
        .then((student) => {
          CourseEnrollment.find({
            studentEnrolled: student,
            semesterEnrolled: semester,
          })
            .then((courseEnrollments) => {
              if (courseEnrollments.length != 0) {
                const title = "ERROR";
                const message = "Latest semester already registered!";
                const icon = "error";
                const href = "/studentHome";
                res.render("alert.ejs", { title, message, icon, href });
              } else {
                CourseAssignment.find({
                  semesterAssigned: semester,
                  programAssigned: student.programRegistered,
                })
                  .populate([
                    {
                      path: "programAssigned",
                      populate: [
                        { path: "degreeOffered", model: Degree },
                        { path: "branchOffered", model: Branch },
                      ],
                    },
                    {
                      path: "instructorAssigned",
                    },
                    {
                      path: "courseAssigned",
                    },
                    {
                      path: "semesterAssigned",
                    },
                  ])
                  .exec()
                  .then((semesterAssignments) => {
                    res.render("semesterRegistration.ejs", {
                      semesterAssignments,
                      student,
                    });
                  })
                  .catch((err) => {
                    console.error(err);
                  });
              }
            })
            .catch((err) => {
              console.error(err);
            });
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post("/semesterRegistration", checkAuthenticatedStudent, (req, res) => {
  if (req.body.register.length != 6) {
    const title = "ERROR";
    const message = "Please select only 6 courses!";
    const icon = "error";
    const href = "/semesterRegistration";
    res.render("alert.ejs", { title, message, icon, href });
  } else {
    for (var i = 0; i < 6; i++) {
      const x = req.body.register[i];
      Student.findById(req.user)
        .then((student) => {
          Course.findById(x)
            .then((course) => {
              Semester.findById(req.body.sem)
                .then((semester) => {
                  const newCourseEnrollment = new CourseEnrollment({
                    semesterEnrolled: semester,
                    studentEnrolled: student,
                    courseEnrolled: course,
                    dateEnrolled: new Date(),
                  });
                  //console.log(newCourseEnrollment);
                  newCourseEnrollment.save();
                })
                .catch((err) => {
                  console.error(err);
                });
            })
            .catch((err) => {
              console.error(err);
            });
        })
        .catch((err) => {
          console.error(err);
        });
    }

    Student.findById(req.user)
      .then((student) => {
        Semester.findById(req.body.sem).then((semester) => {
          Fee.findOne({ programFee: student.programRegistered }).then((fee) => {
            const newFeeHistory = new FeeHistory({
              semesterFee: semester,
              studentEnrolled: student,
              feeStatus: false,
              feePaid: new Map(),
            });

            newFeeHistory.save();

            var transporter = nodemailer.createTransport({
              service: "Outlook365",
              host: "smtp.office365.com",
              port: "587",
              tls: {
                ciphers: "SSLv3",
                rejectUnauthorized: false,
              },
              auth: {
                user: "e-campus-daiict@outlook.com",
                pass: process.env.GMAILPASSWORD,
              },
            });

            const feeStructureEntries = [...fee.feeStructure.entries()];

            const tableRows = feeStructureEntries
              .map(
                (entry) => `
                                    <tr>
                                        <td>${entry[0]}</td>
                                        <td>${entry[1]}</td>
                                    </tr>
                                    `
              )
              .join("");

            const totalFees = feeStructureEntries.reduce(
              (acc, curr) => acc + Number(curr[1]),
              0
            );

            const mailOptions = {
              from: "e-campus-daiict@outlook.com",
              to: student.parentEmail,
              subject: "Fee Payment",
              html: `
                                            <h3>Dear Parent,</h3>
                                            <p>${student.firstname} ${student.middlename} ${student.lastname} has registered for a new semester. Please make sure that the payment process is completed before the due date to avoid any late fees or cancellation of your child's enrollment.</p>
                                            <h4>Fee Structure:</h4>
                                            <table border="1">
                                            <thead>
                                                <tr>
                                                <th>Fee Type</th>
                                                <th>Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${tableRows}
                                            </tbody>
                                            </table>
                                            <p>Total fees: ${totalFees}</p>
                                            <p>Regards</p>
  `,
            };

            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                const title = "ERROR";
                const message = "Unknown error occurred, please try again!";
                const icon = "error";
                const href = "/studentHome";
                res.render("alert.ejs", { title, message, icon, href });
                console.log(error);
              } else {
                console.log("Email sent: " + info.response);
              }
            });

            const title = "SUCCESS";
            const message = "Semester registration completed!";
            const icon = "success";
            const href = "/studentHome";
            res.render("alert.ejs", { title, message, icon, href });
          });
        });
      })
      .catch((err) => {
        console.error(err);
      });
  }
});

app.get("/semesterResults", checkAuthenticatedStudent, (req, res) => {
  CourseEnrollment.find({ studentEnrolled: req.user })
    .distinct("semesterEnrolled")
    .then((enrollment) => {
      Semester.find()
        .where("_id")
        .in(enrollment)
        .sort({ dateCreated: 1 })
        .then((semester) => {
          Student.findOne({ _id: req.user })
            .then((student) => {
              console.log(student);
              res.render("semesterResults.ejs", {
                semester,
                student,
                signal: "1",
              });
            })
            .catch((err) => {
              console.error(err);
            });
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post("/semesterResults", checkAuthenticatedStudent, (req, res) => {
  const tuple = req.body.x.split(" ");
  //console.log(tuple);
  CourseEnrollment.find({
    studentEnrolled: req.user,
    semesterEnrolled: tuple[0],
  })
    .populate(["courseEnrolled", "semesterEnrolled", "studentEnrolled"])
    .exec()
    .then((result) => {
      Student.findOne({ _id: req.user })
        .then((student) => {
          res.render("gradeCard.ejs", {
            result,
            tuple,
            student,
            signal: req.body.signal,
          });
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.get("/semesterResultsAttendance", checkAuthenticatedStudent, (req, res) => {
  CourseEnrollment.find({ studentEnrolled: req.user })
    .distinct("semesterEnrolled")
    .then((enrollment) => {
      Semester.find()
        .where("_id")
        .in(enrollment)
        .sort({ dateCreated: 1 })
        .then((semester) => {
          Student.findOne({ _id: req.user })
            .then((student) => {
              console.log(student);
              res.render("semesterResults.ejs", {
                semester,
                student,
                signal: "2",
              });
            })
            .catch((err) => {
              console.error(err);
            });
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post("/gradeCard", checkAuthenticatedStudent, (req, res) => {
  //console.log(req.body);
  const tuple = req.body.result.split(" ");
  const doc = new PDFDocument();
  const writeStream = fs.createWriteStream("result.pdf");
  doc.pipe(res);

  CourseEnrollment.find({
    studentEnrolled: tuple[1],
    semesterEnrolled: tuple[0],
  })
    .populate(["studentEnrolled", "semesterEnrolled", "courseEnrolled"])
    .exec()
    .then((grades) => {
      doc
        .fontSize(15)
        .text(`Student ID : ${grades[0].studentEnrolled.studentID}`, {
          align: "center",
        })
        .moveDown()
        .text(
          `Full name : ${grades[0].studentEnrolled.firstname} ${grades[0].studentEnrolled.middlename} ${grades[0].studentEnrolled.lastname}`,
          { align: "center" }
        )
        .moveDown()
        .text(`Semester number: ${tuple[2]}`, { align: "center" })
        .moveDown()
        .text(`Semester name: ${grades[0].semesterEnrolled.name}`, {
          align: "center",
        })
        .moveDown();

      var spi = 0, tot_cred = 0;
      for (var i = 0; i < grades.length; i++) {
        spi += grades[i].grade * grades[i].courseEnrolled.credits;
        tot_cred += grades[i].courseEnrolled.credits;
        doc
          .fontSize(10)
          .text(
            `${i + 1} - ${grades[i].courseEnrolled.code} - ${grades[i].courseEnrolled.name
            } - ${grades[i].courseEnrolled.credits} - ${grades[i].grade}`,
            { align: "center" }
          )
          .moveDown();
      }
      spi /= tot_cred;
      spi = Math.round(spi * 100) / 100;
      doc.fontSize(10).text(`SPI : ${spi}`, { align: "center" });

      doc.end();
    })
    .catch((err) => {
      console.error(err);
    });
});

app.get("/viewStudent", checkAuthenticatedStudent, (req, res) => {
  Student.findOne({ _id: req.user })
    .populate([
      {
        path: "programRegistered",
        populate: [
          { path: "degreeOffered", model: Degree },
          { path: "branchOffered", model: Branch },
        ],
      },
    ])
    .exec()
    .then((student) => {
      CourseEnrollment.find({ studentEnrolled: req.user })
        .distinct("semesterEnrolled")
        .then((curr_sem) => {
          var x = curr_sem.length;
          res.render("viewStudent.ejs", { student, x });
        });
    });
});

app.get("/viewInstructor", checkAuthenticatedInstructor, (req, res) => {
  Instructor.findOne({ _id: req.user }).then((instructor) => {
    res.render("viewInstructor.ejs", { instructor });
  });
});

app.get("/updateInstructor", checkAuthenticatedInstructor, (req, res) => {
  Instructor.findOne({ _id: req.user }).then((instructor) => {
    res.render("updateInstructor.ejs", { instructor });
  });
});

app.post("/updateInstructor", checkAuthenticatedInstructor, (req, res) => {
  if (req.body.mobileNO.length != 10) {
    const title = "ERROR";
    const message = "Enter valid Mobile no.";
    const icon = "error";
    const href = "/updateInstructor";
    res.status(401).render("alert.ejs", { title, message, icon, href });
  }
  else {
    Instructor.updateOne(
      { _id: req.user },
      {
        fullname: req.body.fullname,
        mobileNO: req.body.mobileNO,
        myemail: req.body.myemail,
        dob: req.body.dob,
        gender: req.body.gender,
      }
    ).then((instructor) => {
      const title = "SUCCESS";
      const message = "Instructor details updated!";
      const icon = "success";
      const href = "/instructorHome";
      res.render("alert.ejs", { title, message, icon, href });
    });
  }
});

app.get("/updateStudent", checkAuthenticatedStudent, (req, res) => {
  Student.findOne({ _id: req.user }).then((student) => {
    res.render("updateStudent.ejs", { student });
  });
});

app.post("/updateStudent", checkAuthenticatedStudent, (req, res) => {
  if (req.body.mobileNO.length != 10) {
    const title = "ERROR";
    const message = "Enter valid Mobile no.";
    const icon = "error";
    const href = "/updateStudent";
    res.status(401).render("alert.ejs", { title, message, icon, href });
  }
  else {

    Student.updateOne(
      { _id: req.user },
      {
        firstname: req.body.firstname,
        middlename: req.body.middlename,
        lastname: req.body.lastname,
        mobileNO: req.body.mobileNO,
        myemail: req.body.myemail,
        parentEmail: req.body.parentEmail,
        dob: req.body.dob,
        gender: req.body.gender,
        weight: req.body.weight,
        height: req.body.height,
        address: req.body.address,
        bloodGroup: req.body.bloodGroup,
      }
    ).then((student) => {
      const title = "SUCCESS";
      const message = "Student details updated!";
      const icon = "success";
      const href = "/studentHome";
      res.render("alert.ejs", { title, message, icon, href });
    });
  }
});

app.get("/instructorSemester", checkAuthenticatedInstructor, (req, res) => {
  CourseAssignment.find({ instructorAssigned: req.user })
    .distinct("semesterAssigned")
    .then((assignment) => {
      Semester.find()
        .where("_id")
        .in(assignment)
        .sort({ dateCreated: -1 })
        .then((semester) => {
          Instructor.findOne({ _id: req.user })
            .then((instructor) => {
              res.render("instructorSemester.ejs", {
                semester,
                instructor,
                signal: "1",
              });
            })
            .catch((err) => {
              console.error(err);
            });
          //console.log(semester);
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post("/instructorSemester", checkAuthenticatedInstructor, (req, res) => {
  CourseAssignment.find({
    instructorAssigned: req.user,
    semesterAssigned: req.body.x,
  })
    .populate([
      {
        path: "programAssigned",
        populate: [
          { path: "degreeOffered", model: Degree },
          { path: "branchOffered", model: Branch },
        ],
      },
      {
        path: "courseAssigned",
      },
      {
        path: "semesterAssigned",
      },
    ])
    .exec()
    .then((courseAssignment) => {
      Instructor.findOne({ _id: req.user })
        .then((instructor) => {
          res.render("gradeSemester.ejs", {
            courseAssignment,
            instructor,
            signal: req.body.signal,
          });
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });

  // CourseAssignment.aggregate([
  //     { $match: { instructorAssigned: req.user, semesterAssigned: req.body.x } },
  //     { $group: { _id: '$programAssigned', count: { $sum: 1 } } },
  //     { $lookup: { from: 'courses', localField: '_id', foreignField: 'courseAssigned', as: 'courses',
  //                 from: 'semesters', localField: '_id', foreignField: 'semesterAssigned', as: 'semesters',
  //                 from: 'programs', localField: '_id', foreignField: 'programAssigned', as: 'programs'
  //     } },
  //     { $lookup: { from: 'degrees', localField: 'programs._id', foreignField: 'program', as: 'programs.degrees', from: 'branches', localField: 'programs._id', foreignField: 'program', as: 'programs.branches' } }
  // ])
  // .then((ans) => {
  //     console.log(ans);
  // })
});

app.get(
  "/instructorSemesterAttendance",
  checkAuthenticatedInstructor,
  (req, res) => {
    CourseAssignment.find({ instructorAssigned: req.user })
      .distinct("semesterAssigned")
      .then((assignment) => {
        Semester.find()
          .where("_id")
          .in(assignment)
          .sort({ dateCreated: -1 })
          .then((semester) => {
            Instructor.findOne({ _id: req.user })
              .then((instructor) => {
                res.render("instructorSemester.ejs", {
                  semester,
                  instructor,
                  signal: "2",
                });
              })
              .catch((err) => {
                console.error(err);
              });
            //console.log(semester);
          })
          .catch((err) => {
            console.error(err);
          });
      })
      .catch((err) => {
        console.error(err);
      });
  }
);

app.post("/gradeAssign", checkAuthenticatedInstructor, (req, res) => {
  //console.log(req.body.x);
  const tuple = req.body.x.split(" ");
  Student.find({ programRegistered: tuple[2] })
    .then((students) => {
      CourseEnrollment.find({
        semesterEnrolled: tuple[0],
        courseEnrolled: tuple[1],
        studentEnrolled: { $in: students },
      })
        .populate(["courseEnrolled", "studentEnrolled", "semesterEnrolled"])
        .exec()
        .then((gradeStudents) => {
          Instructor.findOne({ _id: req.user })
            .then((instructor) => {
              res.render("addGrade.ejs", {
                gradeStudents,
                instructor,
                signal: tuple[3],
              });
            })
            .catch((err) => {
              console.error(err);
            });
          //console.log(gradeStudents);
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post("/addGrade", checkAuthenticatedInstructor, (req, res) => {
  //console.log(req.body);
  if (req.body.signal == "1") {
    //console.log(typeof(req.body.grades));
    if (typeof req.body.grades == "string") {
      CourseEnrollment.findOneAndUpdate(
        {
          courseEnrolled: req.body.course,
          semesterEnrolled: req.body.semester,
          studentEnrolled: req.body.student,
        },
        { grade: req.body.grades },
        { new: true }
      )
        .populate(["courseEnrolled", "studentEnrolled", "semesterEnrolled"])
        .exec()
        .then((ans) => {
          console.log(ans);

          var transporter = nodemailer.createTransport({
            service: "Outlook365",
            host: "smtp.office365.com",
            port: "587",
            tls: {
              ciphers: "SSLv3",
              rejectUnauthorized: false,
            },
            auth: {
              user: "e-campus-daiict@outlook.com",
              pass: process.env.GMAILPASSWORD,
            },
          });

          var mailOptions = {
            from: "e-campus-daiict@outlook.com",
            to: ans.studentEnrolled.email,
            subject: "Grade Updates",
            html: `
                            <h2> Please note the following updates in grades of ${ans.semesterEnrolled.name}. </h2> <p> <b> Course : </b> ${ans.courseEnrolled.name} </p>
                            <p> <b> Grade recieved : </b> ${ans.grade} </p>
                            `,
          };

          transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              const title = "ERROR";
              const message = "Unknown error occurred, please try again!";
              const icon = "error";
              const href = "/instructorHome";
              res.render("alert.ejs", { title, message, icon, href });
              console.log(error);
            } else {
              console.log("Email sent: " + info.response);
            }
          });
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      for (var i = 0; i < req.body.grades.length; i++) {
        CourseEnrollment.findOneAndUpdate(
          {
            courseEnrolled: req.body.course,
            semesterEnrolled: req.body.semester,
            studentEnrolled: req.body.student[i],
          },
          { grade: req.body.grades[i] },
          { new: true }
        )
          .populate(["courseEnrolled", "studentEnrolled", "semesterEnrolled"])
          .exec()
          .then((ans) => {
            console.log(ans);

            var transporter = nodemailer.createTransport({
              service: "Outlook365",
              host: "smtp.office365.com",
              port: "587",
              tls: {
                ciphers: "SSLv3",
                rejectUnauthorized: false,
              },
              auth: {
                user: "e-campus-daiict@outlook.com",
                pass: process.env.GMAILPASSWORD,
              },
            });

            var mailOptions = {
              from: "e-campus-daiict@outlook.com",
              to: ans.studentEnrolled.email,
              subject: "Grade Updates",
              html: `
                            <h2> Please note the following updates in grades of ${ans.semesterEnrolled.name}. </h2> <p> <b> Course : </b> ${ans.courseEnrolled.name} </p>
                            <p> <b> Grade recieved : </b> ${ans.grade} </p>
                            `,
            };

            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                const title = "ERROR";
                const message = "Unknown error occurred, please try again!";
                const icon = "error";
                const href = "/instructorHome";
                res.render("alert.ejs", { title, message, icon, href });
                console.log(error);
              } else {
                console.log("Email sent: " + info.response);
              }
            });
          })
          .catch((err) => {
            console.error(err);
          });
      }
    }

    const title = "SUCCESS";
    const message = "Grades updated!";
    const icon = "success";
    const href = "/instructorHome";
    res.render("alert.ejs", { title, message, icon, href });
  } else {
    if (typeof req.body.grades == "string") {
      CourseEnrollment.findOneAndUpdate(
        {
          courseEnrolled: req.body.course,
          semesterEnrolled: req.body.semester,
          studentEnrolled: req.body.student,
        },
        { attendance: req.body.grades },
        { new: true }
      )
        .populate(["courseEnrolled", "studentEnrolled", "semesterEnrolled"])
        .exec()
        .then((ans) => { })
        .catch((err) => {
          console.error(err);
        });
    } else {
      for (var i = 0; i < req.body.grades.length; i++) {
        CourseEnrollment.findOneAndUpdate(
          {
            courseEnrolled: req.body.course,
            semesterEnrolled: req.body.semester,
            studentEnrolled: req.body.student[i],
          },
          { attendance: req.body.grades[i] },
          { new: true }
        )
          .populate(["courseEnrolled", "studentEnrolled", "semesterEnrolled"])
          .exec()
          .then((ans) => { })
          .catch((err) => {
            console.error(err);
          });
      }
    }

    const title = "SUCCESS";
    const message = "Attendance updated!";
    const icon = "success";
    const href = "/instructorHome";
    res.render("alert.ejs", { title, message, icon, href });
  }
});

app.get("/addDropAdmin", checkAuthenticatedAdmin, (req, res) => {
  Semester.find()
    .sort({ dateCreated: -1 })
    .limit(1)
    .then((semester) => {
      //console.log(semester);
      res.render("addDrop.ejs", { semester });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post("/addDropAdmin", checkAuthenticatedAdmin, (req, res) => {
  var val = false;
  if (req.body.addDrop == "on") val = true;
  //console.log(val);
  Semester.find()
    .sort({ dateCreated: -1 })
    .limit(1)
    .then((semester) => {
      Semester.findOneAndUpdate(
        { _id: semester[0].id },
        { addDrop: val },
        { new: true }
      )
        .then((x) => {
          console.log(x);
          res.redirect("/adminHome");
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.get("/addDropStudent", checkAuthenticatedStudent, (req, res) => {
  CourseEnrollment.find({ studentEnrolled: req.user })
    .populate([
      {
        path: "semesterEnrolled",
      },
      {
        path: "studentEnrolled",
        populate: [{ path: "programRegistered", model: Program }],
      },
    ])
    .sort({ dateEnrolled: -1 })
    .limit(1)
    .exec()
    .then((x) => {
      if (typeof x[0] === "undefined") {
        const title = "ERROR";
        const message = "Register a semester first to add/drop!";
        const icon = "error";
        const href = "/studentHome";
      } else if (x[0].semesterEnrolled.addDrop == false) {
        const title = "ERROR";
        const message = "Add/Drop currently unavailable!";
        const icon = "error";
        const href = "/studentHome";
        res.render("alert.ejs", { title, message, icon, href });
      } else {
        CourseEnrollment.find({
          studentEnrolled: req.user,
          semesterEnrolled: x[0].semesterEnrolled,
        })
          .populate("courseEnrolled")
          .exec()
          .then((courseEnrollments) => {
            CourseAssignment.find({
              studentAssignment: req.user,
              semesterAssigned: x[0].semesterEnrolled,
              programAssigned: x[0].studentEnrolled.programRegistered,
            })
              .populate([
                {
                  path: "programAssigned",
                  populate: [
                    { path: "degreeOffered", model: Degree },
                    { path: "branchOffered", model: Branch },
                  ],
                },
                {
                  path: "instructorAssigned",
                },
                {
                  path: "courseAssigned",
                },
                {
                  path: "semesterAssigned",
                },
              ])
              .exec()
              .then((courseAssignments) => {
                Student.findOne({ _id: req.user })
                  .then((student) => {
                    res.render("addDropStudent.ejs", {
                      courseEnrollments,
                      courseAssignments,
                      student,
                    });
                  })
                  .catch((err) => {
                    console.error(err);
                  });
              })
              .catch((err) => {
                console.error(err);
              });
          })
          .catch((err) => {
            console.error(err);
          });
      }
    });
});

app.post("/addDropStudent", checkAuthenticatedStudent, (req, res) => {
  if (req.body.register.length != 6) {
    const title = "ERROR";
    const message = "Please select only 6 courses!";
    const icon = "error";
    const href = "/addDropStudent";
    res.status(401).render("alert.ejs", { title, message, icon, href });
  } else {
    CourseEnrollment.deleteMany({
      studentEnrolled: req.user,
      semesterEnrolled: req.body.sem,
    })
      .then(() => {
        for (var i = 0; i < 6; i++) {
          const x = req.body.register[i];
          Student.findById(req.user)
            .then((student) => {
              Course.findById(x)
                .then((course) => {
                  Semester.findById(req.body.sem)
                    .then((semester) => {
                      const newCourseEnrollment = new CourseEnrollment({
                        semesterEnrolled: semester,
                        studentEnrolled: student,
                        courseEnrolled: course,
                        dateEnrolled: new Date(),
                      });
                      //console.log(newCourseEnrollment);
                      newCourseEnrollment.save();
                    })
                    .catch((err) => {
                      console.error(err);
                    });
                })
                .catch((err) => {
                  console.error(err);
                });
            })
            .catch((err) => {
              console.error(err);
            });
        }
        res.status(200).redirect("/studentHome");
      })
      .catch((err) => {
        console.error(err);
      });
    //console.log(req.body.register);
  }
});

app.get("/myComplains", checkAuthenticatedStudent, (req, res) => {
  Student.findOne({ _id: req.user })
    .then((student) => {
      ComplainBox.find({ studentComplained: student }).then((complains) => {
        res.render("myComplains.ejs", { student, complains });
      });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.get("/addComplain", checkAuthenticatedStudent, (req, res) => {
  Student.findOne({ _id: req.user }).then((student) => {
    res.render("addComplain.ejs", { student });
  });
});

app.post("/addComplain", checkAuthenticatedStudent, (req, res) => {
  Student.findOne({ _id: req.user })
    .then((student) => {
      const newComplainBox = new ComplainBox({
        studentComplained: student,
        complain: req.body.complain,
        status: false,
        dateComplained: new Date(),
      });

      newComplainBox.save();

      const title = "SUCCESS";
      const message = "Your Complain has been submitted!";
      const icon = "success";
      const href = "/studentHome";
      res.render("alert.ejs", { title, message, icon, href });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.get("/viewComplains", checkAuthenticatedAdmin, (req, res) => {
  ComplainBox.find({})
    .populate("studentComplained")
    .sort({ dateComplained: -1 })
    .exec()
    .then((complains) => {
      res.render("viewComplains.ejs", { complains });
    });
});

app.delete("/logoutStudent", (req, res) => {
  req.logOut(req.user, (err) => {
    if (err) return next(err);
    res.redirect("/studentLogin");
  });
});

app.delete("/logoutInstructor", (req, res) => {
  req.logOut(req.user, (err) => {
    if (err) return next(err);
    res.redirect("/instructorLogin");
  });
});

app.delete("/logoutAdmin", (req, res) => {
  req.logOut(req.user, (err) => {
    if (err) return next(err);
    res.redirect("/adminLogin");
  });
});

app.get("/passwordStudent", (req, res) => {
  Student.findOne({ _id: req.user }).then((student) => {
    res.render("passwordStudent.ejs", { student });
  });
});
app.get("/passwordAdmin", (req, res) => {
  Admin.findOne({ _id: req.user }).then((admin) => {
    res.render("passwordAdmin.ejs", { admin });
  });
});
app.get("/passwordInstructor", (req, res) => {
  Instructor.findOne({ _id: req.user }).then((instructor) => {
    res.render("passwordInstructor.ejs", { instructor });
  });
});
app.post("/passwordStudent", (req, res) => {
  if (req.body.password != req.body.repassword) {
    const title = "ERROR";
    const message = "Passwords do not match.";
    const icon = "error";
    const href = "/studentHome";
    res.render("alert.ejs", { title, message, icon, href });
    // passwords do not match
  }
  // password not matching the format
  else if (!isValidPassword(req.body.password)) {
    const title = "ERROR";
    const message = "Password should contain 8 to 15 characters with atleast 1 special character, 1 capital letter, 1 small letter and 1 number with zero spaces.";
    const icon = "error";
    const href = "/studentHome";
    res.status(401).render("alert.ejs", { title, message, icon, href });
  }
  else {
    bcrypt
      .hash(req.body.password, saltRounds)
      .then((hashedPassword) => {
        Student.updateOne({ _id: req.user }, { password: hashedPassword })
          .then(() => {
            const title = "SUCCESS";
            const message = "Password updated!";
            const icon = "success";
            const href = "/studentHome";
            res.render("alert.ejs", { title, message, icon, href });
          })
          .catch((err) => {
            console.log(err);
          });
      })
      .catch((err) => {
        console.log(err);
      });
  }
});
app.post("/passwordAdmin", (req, res) => {
  // passwords do not match
  if (req.body.password != req.body.repassword) {
    const title = "ERROR";
    const message = "Passwords do not match.";
    const icon = "error";
    const href = "/adminHome";
    res.render("alert.ejs", { title, message, icon, href });
  }
  //
  else if (!isValidPassword(req.body.password)) {
    const title = "ERROR";
    const message = "Password should contain 8 to 15 characters with atleast 1 special character, 1 capital letter, 1 small letter and 1 number with zero spaces.";
    const icon = "error";
    const href = "/adminHome";
    res.status(401).render("alert.ejs", { title, message, icon, href });
  }
  else {
    bcrypt
      .hash(req.body.password, saltRounds)
      .then((hashedPassword) => {
        Admin.updateOne({ _id: req.user }, { password: hashedPassword })
          .then(() => {
            const title = "SUCCESS";
            const message = "Password updated!";
            const icon = "success";
            const href = "/adminHome";
            res.render("alert.ejs", { title, message, icon, href });
          })
          .catch((err) => {
            console.log(err);
          });
      })
      .catch((err) => {
        console.log(err);
      });
  }
});
app.post("/passwordInstructor", (req, res) => {

  // passwords do not match
  if (req.body.password != req.body.repassword) {
    const title = "ERROR";
    const message = "Passwords do not match.";
    const icon = "error";
    const href = "/instructorHome";
    res.render("alert.ejs", { title, message, icon, href });

  }

  //
  else if (!isValidPassword(req.body.password)) {
    const title = "ERROR";
    const message = "Password should contain 8 to 15 characters with atleast 1 special character, 1 capital letter, 1 small letter and 1 number with zero spaces.";
    const icon = "error";
    const href = "/instructorHome";
    res.status(401).render("alert.ejs", { title, message, icon, href });
  }
  else {
    bcrypt
      .hash(req.body.password, saltRounds)
      .then((hashedPassword) => {
        Instructor.updateOne({ _id: req.user }, { password: hashedPassword })
          .then(() => {
            const title = "SUCCESS";
            const message = "Password updated!";
            const icon = "success";
            const href = "/instructorHome";
            res.render("alert.ejs", { title, message, icon, href });
          })
          .catch((err) => {
            console.log(err);
          });
      })
      .catch((err) => {
        console.log(err);
      });
  }
});

app.get("/feeProgram", checkAuthenticatedAdmin, (req, res) => {
  Program.find({})
    .populate(["degreeOffered", "branchOffered"])
    .exec()
    .then((program) => {
      res.render("feeProgram.ejs", { program });
    })
    .catch((err) => {
      console.log(err);
    });
});

app.post("/feeProgram", checkAuthenticatedAdmin, (req, res) => {
  Program.findOne({ _id: req.body.view })
    .populate(["branchOffered", "degreeOffered"])
    .exec()
    .then((program) => {
      Fee.findOne({ programFee: req.body.view })
        .populate({
          path: "programFee",
          populate: [
            { path: "degreeOffered", model: Degree },
            { path: "branchOffered", model: Branch },
          ],
        })
        .exec()
        .then((structure) => {
          res.render("feeStructure.ejs", { structure, program });
        })
        .catch((err) => {
          console.log(err);
        });
    })
    .catch((err) => {
      console.log(err);
    });
});

app.post("/feeStructure", checkAuthenticatedAdmin, (req, res) => {
  const tuple = req.body.delete.split(",");
  //console.log(tuple);
  Fee.findOneAndUpdate(
    { programFee: tuple[0] },
    { $unset: { [`feeStructure.${tuple[1]}`]: 1 } },
    { new: true }
  )
    .then((x) => {
      res.redirect("/feeProgram");
    })
    .catch((err) => {
      console.log(err);
    });
});

app.post("/addFee", checkAuthenticatedAdmin, (req, res) => {
  //console.log(req.body);
  Program.findOne({ _id: req.body.program })
    .populate(["branchOffered", "degreeOffered"])
    .exec()
    .then((program) => {
      console.log(program);
      res.render("addFee.ejs", { program });
    })
    .catch((err) => {
      console.log(err);
    });
});

app.post("/addFeeData", checkAuthenticatedAdmin, (req, res) => {
  console.log(req.body);
  const { charge, amount, program } = req.body;

  Fee.findOne({ programFee: program })
    .populate("feeStructure")
    .exec()
    .then((result) => {
      console.log(result);
      if (result === null) {
        const newFee = new Fee();
        newFee.feeStructure = new Map();
        newFee.feeStructure.set(charge, amount);
        newFee.programFee = program;

        newFee.save().then(() => {
          res.redirect("/feeProgram");
        });
      } else {
        Fee.findOneAndUpdate(
          { programFee: program },
          { $set: { [`feeStructure.${charge}`]: amount } },
          { new: true }
        )
          .then((x) => {
            res.redirect("/feeProgram");
          })
          .catch((err) => {
            console.log(err);
          });
      }
    });
});

app.get("/feeSemesterPayments", checkAuthenticatedAdmin, (req, res) => {
  Semester.find({})
    .sort({ dateCreated: -1 })
    .then((semester) => {
      res.render("feeSemesterPayments.ejs", { semester });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post("/feeSemesterPayments", checkAuthenticatedAdmin, (req, res) => {
  Semester.findOne({ _id: req.body.view })
    .populate({
      path: "programsOffered",
      populate: [
        { path: "degreeOffered", model: Degree },
        { path: "branchOffered", model: Branch },
      ],
    })
    .exec()
    .then((semester) => {
      res.render("feeProgramPayments.ejs", { semester });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post("/feeProgramPayments", checkAuthenticatedAdmin, (req, res) => {
  // const tuple = req.body.x.split(" ");
  // Student.find({ 'programRegistered': tuple[2] })
  //     .then((students) => {
  //         CourseEnrollment.find({ 'semesterEnrolled': tuple[0], 'courseEnrolled': tuple[1], 'studentEnrolled': { $in: students } })
  //             .populate(['courseEnrolled', 'studentEnrolled', 'semesterEnrolled'])
  //             .exec()
  //             .then((gradeStudents) => {
  const tuple = req.body.view.split(" ");
  //console.log(tuple[0] + " " + tuple[1]);
  Student.find({ programRegistered: tuple[0] })
    .then((students) => {
      CourseEnrollment.find({
        semesterEnrolled: tuple[1],
        studentEnrolled: { $in: students },
      })
        .distinct("studentEnrolled")
        .then((enrollments) => {
          FeeHistory.find({
            studentEnrolled: { $in: students },
            semesterFee: tuple[1],
          })
            .populate("studentEnrolled")
            .then((history) => {
              res.render("feeStudentPayments.ejs", {
                students,
                history,
                enrollments,
                semesterID: tuple[1],
                programID: tuple[0],
              });
            })
            .catch((err) => {
              console.error(err);
            });
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post("/feeStudentPayments", checkAuthenticatedAdmin, (req, res) => {
  //console.log(req.body);
  if (req.body.add) {
    const tuple = req.body.add.split(" ");

    Fee.findOne({ programFee: tuple[2] })
      .then((fee) => {
        if (fee == null) {
          const title = "ERROR";
          const message = "Fee structure not added!";
          const icon = "error";
          const href = "/adminHome";
          res.render("alert.ejs", { title, message, icon, href });
        } else {
          FeeHistory.findOneAndUpdate(
            { studentEnrolled: tuple[0], semesterFee: tuple[1] },
            {
              feeStatus: true,
              datePaid: new Date(),
              feePaid: fee.feeStructure,
            },
            { new: true }
          )
            .populate("studentEnrolled")
            .exec()
            .then((fees) => {
              var transporter = nodemailer.createTransport({
                service: "Outlook365",
                host: "smtp.office365.com",
                port: "587",
                tls: {
                  ciphers: "SSLv3",
                  rejectUnauthorized: false,
                },
                auth: {
                  user: "e-campus-daiict@outlook.com",
                  pass: process.env.GMAILPASSWORD,
                },
              });

              const mailOptions = {
                from: "e-campus-daiict@outlook.com",
                to: fees.studentEnrolled.parentEmail,
                subject: "Fee Payment",
                html: `
                                        <h3>Dear Parent,</h3>
                                        <p>Fees for your child ${fees.studentEnrolled.firstname} ${fees.studentEnrolled.middlename} ${fees.studentEnrolled.lastname} has been recieved. </p> 
                                        <p>Thank you!</p>   
                                        `,
              };

              transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                  const title = "ERROR";
                  const message = "Unknown error occurred, please try again!";
                  const icon = "error";
                  const href = "/adminHome";
                  res.render("alert.ejs", { title, message, icon, href });
                  console.log(error);
                } else {
                  console.log("Email sent: " + info.response);
                }
              });

              const title = "SUCCESS";
              const message = "Fees marked as recieved!";
              const icon = "success";
              const href = "/adminHome";
              res.render("alert.ejs", { title, message, icon, href });
            })

            .catch((err) => {
              console.error(err);
            });
        }
      })
      .catch((err) => {
        console.error(err);
      });
  } else {
    const tuple = req.body.view.split(" ");

    FeeHistory.findOne({ studentEnrolled: tuple[0], semesterFee: tuple[1] })
      .populate(["studentEnrolled", "semesterFee"])
      .exec()
      .then((history) => {
        res.render("viewRecieptAdmin.ejs", { history });
      });
  }
});

app.get("/semesterFee", checkAuthenticatedStudent, (req, res) => {
  CourseEnrollment.find({ studentEnrolled: req.user })
    .distinct("semesterEnrolled")
    .then((enrollment) => {
      Semester.find()
        .where("_id")
        .in(enrollment)
        .sort({ dateCreated: 1 })
        .then((semester) => {
          Student.findOne({ _id: req.user })
            .then((student) => {
              FeeHistory.find({ studentEnrolled: req.user })
                .populate("semesterFee")
                .then((history) => {
                  res.render("semesterFee.ejs", { semester, student, history });
                })
                .catch((err) => {
                  console.error(err);
                });
            })
            .catch((err) => {
              console.error(err);
            });
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post("/semesterFee", checkAuthenticatedStudent, (req, res) => {
  const tuple = req.body.view.split(" ");
  FeeHistory.findOne({ studentEnrolled: req.user, semesterFee: tuple[0] })
    .populate(["studentEnrolled", "semesterFee"])
    .exec()
    .then((history) => {
      Student.findOne({ _id: req.user })
        .then((student) => {
          //console.log(history);
          res.render("feeReciept.ejs", { history, sem: tuple[1], student });
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post("/pdf-reciept", checkAuthenticatedStudent, (req, res) => {
  const tuple = req.body.download.split(" ");
  const doc = new PDFDocument();
  const writeStream = fs.createWriteStream("fee.pdf");
  doc.pipe(res);

  FeeHistory.findOne({ studentEnrolled: tuple[0], semesterFee: tuple[1] })
    .populate(["studentEnrolled", "semesterFee"])
    .exec()
    .then((history) => {
      doc
        .fontSize(15)
        .text(`Student ID : ${history.studentEnrolled.studentID}`, {
          align: "center",
        })
        .moveDown()
        .text(
          `Full name : ${history.studentEnrolled.firstname} ${history.studentEnrolled.middlename} ${history.studentEnrolled.lastname}`,
          { align: "center" }
        )
        .moveDown()
        .text(`Semester number: ${tuple[2]}`, { align: "center" })
        .moveDown()
        .text(`Date paid: ${history.datePaid}`, { align: "center" })
        .moveDown()
        .text(`Reciept number: ${history.id}`, { align: "center" })
        .moveDown();

      var totalAmount = 0;
      for (let [key, value] of history.feePaid) {
        totalAmount += parseInt(value);
        doc
          .fontSize(10)
          .text(`${key} : ${value}`, { align: "center" })
          .moveDown();
      }

      doc
        .fontSize(10)
        .text(`Total amount : ${totalAmount}`, { align: "center" });

      doc.end();
    });
});

app.get("/forgotPasswordStudent", (req, res) => {
  res.render("forgotPasswordStudent.ejs");
});

app.get("/forgotPasswordInstructor", (req, res) => {
  res.render("forgotPasswordInstructor.ejs");
});

app.get("/forgotPasswordAdmin", (req, res) => {
  res.render("forgotPasswordAdmin.ejs");
});

app.post("/forgotPasswordStudent", (req, res) => {
  Student.findOne({ email: req.body.email }).then((student) => {
    if (student == null) {
      const title = "ERROR";
      const message = "No such student email exist";
      const icon = "error";
      const href = "/studentLogin";
      res.render("alert.ejs", { title, message, icon, href });
    }

    else {
      function generateP() {
        var pass = "";
        var str =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + "abcdefghijklmnopqrstuvwxyz0123456789@#$";

        for (let i = 1; i <= 10; i++) {
          var char = Math.floor(Math.random() * str.length + 1);

          pass += str.charAt(char);
        }

        return pass;
      }

      const randomPass = generateP();
      bcrypt
        .hash(randomPass, saltRounds)
        .then((hashedPassword) => {

          Student.findOneAndUpdate({ 'email': req.body.email }, { 'password': hashedPassword }, { new: true })
            .then((student) => {
              var transporter = nodemailer.createTransport({
                service: "Outlook365",
                host: "smtp.office365.com",
                port: "587",
                tls: {
                  ciphers: "SSLv3",
                  rejectUnauthorized: false,
                },
                auth: {
                  user: "e-campus-daiict@outlook.com",
                  pass: process.env.GMAILPASSWORD,
                },
              });

              var mailOptions = {
                from: "e-campus-daiict@outlook.com",
                to: req.body.email,
                subject: "Password reset",
                html: `
                                  <h2> Your password is rest. </h2>
                                  <p> Your credentials are: </p>
                                  <p> <b> Email ID : </b> ${req.body.email} </p>
                                  <p> <b> New Password : </b> ${randomPass} </p> 
                                  <a href="https://e-campus-vugi.onrender.com/studentLogin" >Click here to login</a>
                                  `,
              };

              transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                  const title = "ERROR";
                  const message = "Unknown error occurred, please try again!";
                  const icon = "error";
                  const href = "/studentLogin";
                  res.render("alert.ejs", { title, message, icon, href });
                } else {
                  console.log("Email sent: " + info.response);
                }
              });

              const title = "SUCCESS";
              const message = "Check your mail to access your new password";
              const icon = "success";
              const href = "/studentLogin";
              res.render("alert.ejs", { title, message, icon, href });
            })
        })
        .catch((err) => {
          console.log("Error:", err);
        });
    }
  });
});

app.post("/forgotPasswordInstructor", (req, res) => {
  Instructor.findOne({ email: req.body.email }).then((instructor) => {
    if (instructor == null) {
      const title = "ERROR";
      const message = "No such instructor email exist";
      const icon = "error";
      const href = "/instructorLogin";
      res.render("alert.ejs", { title, message, icon, href });
    }

    else {
      function generateP() {
        var pass = "";
        var str =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + "abcdefghijklmnopqrstuvwxyz0123456789@#$";

        for (let i = 1; i <= 10; i++) {
          var char = Math.floor(Math.random() * str.length + 1);

          pass += str.charAt(char);
        }

        return pass;
      }

      const randomPass = generateP();
      bcrypt
        .hash(randomPass, saltRounds)
        .then((hashedPassword) => {

          Instructor.findOneAndUpdate({ 'email': req.body.email }, { 'password': hashedPassword }, { new: true })
            .then((instructor) => {
              var transporter = nodemailer.createTransport({
                service: "Outlook365",
                host: "smtp.office365.com",
                port: "587",
                tls: {
                  ciphers: "SSLv3",
                  rejectUnauthorized: false,
                },
                auth: {
                  user: "e-campus-daiict@outlook.com",
                  pass: process.env.GMAILPASSWORD,
                },
              });

              var mailOptions = {
                from: "e-campus-daiict@outlook.com",
                to: req.body.email,
                subject: "Password reset",
                html: `
                                    <h2> Your password is rest. </h2>
                                    <p> Your credentials are: </p>
                                    <p> <b> Email ID : </b> ${req.body.email} </p>
                                    <p> <b> New Password : </b> ${randomPass} </p> 
                                    <a href="https://e-campus-vugi.onrender.com/instructorLogin" >Click here to login</a>
                                    `,
              };

              transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                  const title = "ERROR";
                  const message = "Unknown error occurred, please try again!";
                  const icon = "error";
                  const href = "/instructorLogin";
                  res.render("alert.ejs", { title, message, icon, href });
                } else {
                  console.log("Email sent: " + info.response);
                }
              });

              const title = "SUCCESS";
              const message = "Check your mail to access your new password";
              const icon = "success";
              const href = "/instructorLogin";
              res.render("alert.ejs", { title, message, icon, href });
            })
        })
        .catch((err) => {
          console.log("Error:", err);
        });
    }
  });
});

app.post("/forgotPasswordAdmin", (req, res) => {
  Admin.findOne({ email: req.body.email }).then((admin) => {
    if (admin == null) {
      const title = "ERROR";
      const message = "No such admin email exist";
      const icon = "error";
      const href = "/adminLogin";
      res.render("alert.ejs", { title, message, icon, href });
    }

    else {
      function generateP() {
        var pass = "";
        var str =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + "abcdefghijklmnopqrstuvwxyz0123456789@#$";

        for (let i = 1; i <= 10; i++) {
          var char = Math.floor(Math.random() * str.length + 1);

          pass += str.charAt(char);
        }

        return pass;
      }

      const randomPass = generateP();
      bcrypt
        .hash(randomPass, saltRounds)
        .then((hashedPassword) => {

          Admin.findOneAndUpdate({ 'email': req.body.email }, { 'password': hashedPassword }, { new: true })
            .then((admin) => {
              var transporter = nodemailer.createTransport({
                service: "Outlook365",
                host: "smtp.office365.com",
                port: "587",
                tls: {
                  ciphers: "SSLv3",
                  rejectUnauthorized: false,
                },
                auth: {
                  user: "e-campus-daiict@outlook.com",
                  pass: process.env.GMAILPASSWORD,
                },
              });

              var mailOptions = {
                from: "e-campus-daiict@outlook.com",
                to: req.body.email,
                subject: "Password reset",
                html: `
                                    <h2> Your password is rest. </h2>
                                    <p> Your credentials are: </p>
                                    <p> <b> Email ID : </b> ${req.body.email} </p>
                                    <p> <b> New Password : </b> ${randomPass} </p> 
                                    <a href="https://e-campus-vugi.onrender.com/adminLogin" >Click here to login</a>
                                    `,
              };

              transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                  const title = "ERROR";
                  const message = "Unknown error occurred, please try again!";
                  const icon = "error";
                  const href = "/adminLogin";
                  res.render("alert.ejs", { title, message, icon, href });
                } else {
                  console.log("Email sent: " + info.response);
                }
              });

              const title = "SUCCESS";
              const message = "Check your mail to access your new password";
              const icon = "success";
              const href = "/adminLogin";
              res.render("alert.ejs", { title, message, icon, href });
            })
        })
        .catch((err) => {
          console.log("Error:", err);
        });
    }
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error.ejs", { message: err.message });
});

app.get("*", (req, res) => {
  res.render("error.ejs", { message: "Page not found" });
});

function checkAuthenticatedStudent(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/studentLogin");
}

function checkNotAuthenticatedStudent(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/studentHome");
  }
  next();
}

function checkAuthenticatedInstructor(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/instructorLogin");
}

function checkNotAuthenticatedInstructor(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/instructorHome");
  }
  next();
}

function checkAuthenticatedAdmin(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/adminLogin");
}

function checkNotAuthenticatedAdmin(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/adminHome");
  }
  next();
}

if (!module.parent) {
  app.listen(3000, function () {
    console.log("server is active");
  });
}

module.exports = app;
