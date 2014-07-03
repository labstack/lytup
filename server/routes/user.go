package routes

import (
	"github.com/dgrijalva/jwt-go"
	"github.com/go-martini/martini"
	"github.com/labstack/lytup/server/models"
	"github.com/labstack/lytup/server/utils"
	"github.com/martini-contrib/render"
	"labix.org/v2/mgo/bson"
	"net/http"
	"strings"
)

// var (
// 	PRIVATE_KEY []byte
// 	PUBLIC_KEY  []byte
// )
//
// func init() {
// 	usr, _ := user.Current()
// 	PRIVATE_KEY, _ = ioutil.ReadFile(path.Join(usr.HomeDir, ".ssh/id_rsa"))
// 	PUBLIC_KEY, _ = ioutil.ReadFile(path.Join(usr.HomeDir, ".ssh/id_rsa.pub"))
// 	log.Println(string(PRIVATE_KEY))
// }

func CreateUser(ren render.Render, usr models.User) {
	usr.HashedPassword = utils.HashPassword([]byte(usr.Password))
	usr.Create()
	ren.JSON(http.StatusCreated, usr.Render())
}

func FindUser(ren render.Render, usr *models.User) {
	usr.Find()
	ren.JSON(http.StatusOK, usr.Render())
}

func Login(ren render.Render, usr models.User) {
	usr.Login()
	ren.JSON(http.StatusOK, usr.Render())
}

func ValidateToken(req *http.Request, rw http.ResponseWriter, ctx martini.Context) {
	parts := strings.Fields(req.Header.Get("Authorization"))
	if len(parts) == 2 {
		token := parts[1]
		t, err := jwt.Parse(token, func(t *jwt.Token) ([]byte, error) {
			return utils.KEY, nil
		})
		if err == nil && t.Valid {
			id := t.Claims["usr-id"].(string)
			usr := models.User{Id: bson.ObjectIdHex(id)}
			ctx.Map(&usr)
			return
		}
	}
	rw.WriteHeader(http.StatusUnauthorized)
}
