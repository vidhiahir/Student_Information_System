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
isValidNumber = (inputNumber) => {
    var re = /^(\d{3})[- ]?(\d{3})[- ]?(\d{4})$/

    return re.test(inputNumber);
}
// mobile number and password format constraints added to student registration page
app.post("/studentDetails",
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
                })
                .catch((err) => {
                    console.log(err);
                });
        }
    }
);

// mobile number and password format constraints added to instructor registration page
app.post("/instructorDetails", checkAuthenticatedInstructor, (req, res) => {
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
                Instructor.updateOne(
                    { _id: req.user },
                    {
                        dob: req.body.dob,
                        myemail: req.body.myemail,
                        gender: req.body.gender,
                        mobileNO: req.body.mobileNO,
                        password: hashedPassword,
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
            })
            .catch((err) => {
                console.log(err);
            });
    }
});

//password format constraint added to reset password page for student
app.post("/passwordStudent", (req, res) => {
    // passwords do not match
    if (req.body.password != req.body.repassword) {
        const title = "ERROR";
        const message = "Passwords do not match.";
        const icon = "error";
        const href = "/studentHome";
        res.render("alert.ejs", { title, message, icon, href });

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

// password format constraint added to reset password page for instructor

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

// password format constraint added to reset password page for admin

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