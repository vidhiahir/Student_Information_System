const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')

function initialize(passportStudent, getUserByEmail, getUserById) 
{
  const authenticateUser = async (email, password, done) => 
  {
    const user = await getUserByEmail(email)

    if (!user) {
      return done(null, false, { message: 'No such email registered!' })
    }

    try {
      if (await bcrypt.compare(password, user.password)) {
        return done(null, user)
      } else {
        return done(null, false, { message: 'Incorrect password!' })
      }
    } catch (e) {
      return done(e)
    }
  }

  passportStudent.use('student', new LocalStrategy({ usernameField: 'email' }, authenticateUser))
  passportStudent.serializeUser((user, done) => done(null, user.id))
  passportStudent.deserializeUser((id, done) => {
    return done(null, getUserById(id))
  })
}

module.exports = initialize