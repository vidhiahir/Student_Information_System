const chai = require("chai");
const expect = chai.expect;
const chaiHttp = require("chai-http");
const server = require("../server"); // Your backend server file

chai.use(chaiHttp);

describe("http://localhost:3000", () => {
  describe("GET /studentLogin", () => {
    it("should return a 200 status code", async () => {
      const res = await chai.request(server).get("/studentLogin");
      expect(res).to.have.status(200);
    });
  });

  describe("GET /studentLogin", () => {
    it("should return a 200 status code", async () => {
      const res = await chai
        .request(server)
        .post("/studentLogin")
        .send({ email: "nagrechadevarsh58@gmail.com", password: "a" });
      expect(res).to.have.status(200);
    });

    it("should return a 401 status code", async () => {
      const res = await chai
        .request(server)
        .post("/studentLogin")
        .send({ email: "nagrechadevarsh58@gmail.com", password: "abcd" });
        expect(res).to.have.status(401);
    });

    // it("should return a message of incoorect email", async () => {
    //   const res = await chai
    //     .request(server)
    //     .post("/studentLogin")
    //     .send({ email: "nagrechsh58@gmail.com", password: "a" });
    //     expect(res).to.have.status(400);
    //     expect(res.body.message).to.equal('No such email registered!');
    // });

    // it("should return a message of missing credentials", async () => {
    //   const res = await chai
    //     .request(server)
    //     .post("/studentLogin")
    //     .send({ email: "", password: "" });
    //     expect(res).to.have.status(400);
    //     expect(res.body.message).to.equal('Missing credentials');
    // });
  });
});