const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')

function initialize(passportAdmin, getUserByEmail, getUserById) 
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

  passportAdmin.use('admin', new LocalStrategy({ usernameField: 'email' }, authenticateUser))
  passportAdmin.serializeUser((user, done) => done(null, user.id))
  passportAdmin.deserializeUser((id, done) => {
    return done(null, getUserById(id))
  })
}

module.exports = initialize